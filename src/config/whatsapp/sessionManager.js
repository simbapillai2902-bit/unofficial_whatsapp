// Polyfill Web Crypto API for Node 18
if (!globalThis.crypto) {
    globalThis.crypto = require('crypto').webcrypto;
}

let baileys;
async function getBaileys() {
    if (!baileys) {
        baileys = await import('@whiskeysockets/baileys');
    }
    return baileys;
}

const P = require("pino");
const qrcode = require("qrcode");
const { createLogger } = require("../../logger");
const dbConnection = require('../dbConnection');

const logger = createLogger('session-manager');

const session = {};
let sessionCleanupInterval = null;

const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MS) || 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000;
const MAX_SESSIONS = parseInt(process.env.MAX_ACTIVE_SESSIONS) || 100;

const createSession = async (sessionName) => {

    try {

        // Max session limit
        if (Object.keys(session).length >= MAX_SESSIONS) {
            throw new Error(
                `Maximum active sessions (${MAX_SESSIONS}) reached`
            );
        }

        // Close old session if exists
        if (session[sessionName]?.sock) {

            logger.warn(
                { sessionName },
                'Session already exists, closing old session'
            );

            try {

                session[sessionName].sock.ev.removeAllListeners();

                session[sessionName].sock.end();

            } catch (e) {

                logger.error(
                    {
                        error: e.message,
                        sessionName
                    },
                    'Error closing old session'
                );
            }
        }

        const {
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason
        } = await getBaileys();

        const { state, saveCreds } =
            await useMultiFileAuthState(`session/${sessionName}`);

        const sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' })
        });

        // Store session
        session[sessionName] = {
            id: null,
            sessionName,
            sock,
            connected: false,
            reconnecting: false,
            qr: null,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            messageCount: 0,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

        // Save creds
        sock.ev.on('creds.update', saveCreds);

        // Connection updates
        sock.ev.on('connection.update', async (update) => {

            try {

                const { connection, qr, lastDisconnect } = update;

                // QR generated
                if (qr) {

                    try {

                        const qrImage =
                            await qrcode.toDataURL(qr);

                        session[sessionName].qr = qrImage;

                        logger.info(
                            { sessionName },
                            'QR code generated'
                        );

                    } catch (error) {

                        logger.error(
                            {
                                error: error.message,
                                sessionName
                            },
                            'Error generating QR code'
                        );
                    }
                }

                // Connected
                if (connection === 'open') {

                    session[sessionName].connected = true;

                    session[sessionName].reconnecting = false;

                    session[sessionName].reconnectAttempts = 0;

                    // Fetch DB ID
                    try {

                        const [configs] =
                            await dbConnection.query(
                                `SELECT id
                                 FROM whatsapp_configs
                                 WHERE session_name = ?
                                 LIMIT 1`,
                                [sessionName]
                            );

                        if (configs.length > 0) {

                            session[sessionName].id =
                                configs[0].id;
                        }

                    } catch (dbError) {

                        logger.error(
                            {
                                sessionName,
                                error: dbError.message
                            },
                            'Failed to fetch session ID'
                        );
                    }

                    logger.info(
                        {
                            sessionName,
                            sessionId:
                                session[sessionName].id
                        },
                        'Session connected'
                    );
                }

                // Connection closed
                if (connection === 'close') {

                    session[sessionName].connected = false;

                    const shouldReconnect =
                        lastDisconnect?.error?.output?.statusCode !==
                        DisconnectReason.loggedOut;

                    // Reconnect logic
                    if (
                        shouldReconnect &&
                        !session[sessionName]?.reconnecting &&
                        session[sessionName]?.reconnectAttempts <
                        session[sessionName]?.maxReconnectAttempts
                    ) {

                        session[sessionName].reconnecting = true;

                        session[sessionName].reconnectAttempts++;

                        logger.info(
                            {
                                sessionName,
                                attempt:
                                    session[sessionName]
                                        .reconnectAttempts
                            },
                            'Attempting to reconnect'
                        );

                        // Wait before reconnect
                        await new Promise((resolve) =>
                            setTimeout(resolve, 3000)
                        );

                        try {

                            // Cleanup old socket
                            if (session[sessionName]?.sock) {

                                session[sessionName]
                                    .sock.ev.removeAllListeners();

                                try {

                                    session[sessionName]
                                        .sock.end();

                                } catch (e) {}
                            }

                            delete session[sessionName];

                            // Recreate session
                            await createSession(sessionName);

                        } catch (reconnectError) {

                            logger.error(
                                {
                                    sessionName,
                                    error:
                                        reconnectError.message
                                },
                                'Reconnect failed'
                            );
                        }

                    } else {

                        logger.warn(
                            { sessionName },
                            'Max reconnect attempts reached or logged out'
                        );

                        // Cleanup
                        try {

                            if (session[sessionName]?.sock) {

                                session[sessionName]
                                    .sock.ev.removeAllListeners();

                                session[sessionName]
                                    .sock.end();
                            }

                        } catch (e) {}

                        delete session[sessionName];
                    }
                }

            } catch (connectionError) {

                logger.error(
                    {
                        sessionName,
                        error: connectionError.message
                    },
                    'Connection update error'
                );
            }
        });

        // Message updates
        sock.ev.on('messages.update', (updates) => {

            try {

                for (const update of updates) {

                    logger.debug(
                        {
                            sessionName,
                            messageId: update.key?.id,
                            status: update.update?.status
                        },
                        'Message status update received'
                    );

                    // Delivered (status 3)
                    if (
                        update.update?.status === 3
                    ) {

                        logger.info(
                            {
                                sessionName,
                                messageId: update.key?.id
                            },
                            'Message delivered'
                        );

                        // Update database with proper error handling
                        if (update.key?.id) {
                            (async () => {
                                try {
                                    // Update campaign_queue with delivered_at timestamp
                                    const deliveryResult = await dbConnection.query(
                                        `UPDATE campaign_queue 
                                         SET queue_status = 'delivered', delivered_at = NOW(), updated_at = NOW() 
                                         WHERE message_id = ?`,
                                        [update.key.id]
                                    );
                                    
                                    // Update message_logs
                                    await dbConnection.query(
                                        `UPDATE message_logs 
                                         SET delivery_status = 'delivered', delivery_time = NOW() 
                                         WHERE message_id = ?`,
                                        [update.key.id]
                                    );
                                    
                                    if (deliveryResult[0].affectedRows > 0) {
                                        logger.info(
                                            { messageId: update.key.id },
                                            'Message delivery status updated in database'
                                        );
                                    }
                                } catch (dbError) {
                                    logger.error(
                                        { 
                                            messageId: update.key.id, 
                                            error: dbError.message,
                                            code: dbError.code
                                        },
                                        'Failed to update delivery status in database'
                                    );
                                }
                            })();
                        }
                    }

                    // Read (status 4)
                    if (
                        update.update?.status === 4
                    ) {

                        logger.info(
                            {
                                sessionName,
                                messageId: update.key?.id
                            },
                            'Message read'
                        );

                        // Update database with proper error handling
                        if (update.key?.id) {
                            (async () => {
                                try {
                                    // Update campaign_queue with read_at timestamp
                                    const readResult = await dbConnection.query(
                                        `UPDATE campaign_queue 
                                         SET queue_status = 'read', read_at = NOW(), updated_at = NOW() 
                                         WHERE message_id = ?`,
                                        [update.key.id]
                                    );
                                    
                                    // Update message_logs
                                    await dbConnection.query(
                                        `UPDATE message_logs 
                                         SET delivery_status = 'read', read_time = NOW() 
                                         WHERE message_id = ?`,
                                        [update.key.id]
                                    );
                                    
                                    if (readResult[0].affectedRows > 0) {
                                        logger.info(
                                            { messageId: update.key.id },
                                            'Message read status updated in database'
                                        );
                                    }
                                } catch (dbError) {
                                    logger.error(
                                        { 
                                            messageId: update.key.id, 
                                            error: dbError.message,
                                            code: dbError.code
                                        },
                                        'Failed to update read status in database'
                                    );
                                }
                            })();
                        }
                    }
                }

            } catch (messageError) {

                logger.error(
                    {
                        sessionName,
                        error: messageError.message
                    },
                    'Message update error'
                );
            }
        });

        logger.info(
            { sessionName },
            'Session created'
        );

        return session[sessionName];

    } catch (error) {

        logger.error(
            {
                error: error.message,
                sessionName
            },
            'Failed to create session'
        );

        try {

            if (session[sessionName]?.sock) {

                session[sessionName]
                    .sock.ev.removeAllListeners();

                session[sessionName].sock.end();
            }

        } catch (e) {}

        delete session[sessionName];

        throw error;
    }
};
const getSession = (sessionName) => {
    const sess = session[sessionName];
    if (sess) {
        sess.lastActivity = Date.now();
    }
    return sess;
};

const getAllSessions = () => {
    return Object.keys(session).map(key => ({
        name: key,
        id: session[key].id,
        connected: session[key].connected,
        createdAt: session[key].createdAt,
        lastActivity: session[key].lastActivity,
        qr: session[key].qr ? true : false
    }));
};

const deleteSession = async (sessionName) => {
    try {
        if (session[sessionName]?.sock) {
            await session[sessionName].sock.end();
        }
        delete session[sessionName];
        logger.info({ sessionName }, 'Session deleted');
    } catch (error) {
        logger.error({ error: error.message, sessionName }, 'Error deleting session');
    }
};

// Cleanup old sessions periodically
const startSessionCleanup = () => {
    if (sessionCleanupInterval) {
        return;
    }

    sessionCleanupInterval = setInterval(async () => {
        try {
            const now = Date.now();
            let sessionsDeleted = 0;

            for (const sessionName of Object.keys(session)) {
                const sess = session[sessionName];

                // Delete if inactive for too long
                if (now - sess.lastActivity > SESSION_TIMEOUT) {
                    await deleteSession(sessionName);
                    sessionsDeleted++;
                }
            }

            if (sessionsDeleted > 0) {
                logger.info({ sessionsDeleted }, 'Cleaned up inactive sessions');
            }
        } catch (error) {
            logger.error({ error: error.message }, 'Error in session cleanup');
        }
    }, CLEANUP_INTERVAL);
};

const stopSessionCleanup = () => {
    if (sessionCleanupInterval) {
        clearInterval(sessionCleanupInterval);
        sessionCleanupInterval = null;
        logger.info('Session cleanup stopped');
    }
};

const loadSavedSessions = async () => {
    const fs = require('fs');
    const path = require('path');
    try {
        const sessionDirPath = path.join(process.cwd(), 'session');
        if (!fs.existsSync(sessionDirPath)) {
            logger.info('Session directory does not exist yet.');
            return;
        }

        const files = fs.readdirSync(sessionDirPath);
        const sessionFolders = files.filter(file => {
            const fullPath = path.join(sessionDirPath, file);
            return fs.statSync(fullPath).isDirectory() && /^session\d+$/.test(file);
        });

        logger.info(`Found ${sessionFolders.length} saved sessions to restore on startup.`);
        for (const sessionName of sessionFolders) {
            logger.info({ sessionName }, 'Restoring saved WhatsApp session...');
            createSession(sessionName).catch(err => {
                logger.error({ sessionName, error: err.message }, 'Failed to restore session on startup');
            });
            // Sleep for 1 second between restores to prevent resource exhaustion
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (err) {
        logger.error({ error: err.message }, 'Error restoring saved sessions on startup');
    }
};

const closeAllSessions = async () => {
    try {
        stopSessionCleanup();

        for (const sessionName of Object.keys(session)) {
            await deleteSession(sessionName);
        }

        logger.info('All sessions closed');
    } catch (error) {
        logger.error({ error: error.message }, 'Error closing all sessions');
    }
};

module.exports = {
    createSession,
    getSession,
    getAllSessions,
    deleteSession,
    startSessionCleanup,
    stopSessionCleanup,
    closeAllSessions,
    loadSavedSessions
};
