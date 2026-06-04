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
const chatStore = require("./chatStore");

const logger = createLogger('session-manager');

const session = {};
let sessionCleanupInterval = null;

const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MS) || 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000;
const MAX_SESSIONS = parseInt(process.env.MAX_ACTIVE_SESSIONS) || 100;

const notifyWebhook = async (messageId, status, errorMsg = null) => {
    try {
        const [rows] = await dbConnection.query(
            `SELECT c.id AS campaign_id, c.webhook_url, q.phone_number 
             FROM campaign_queue q
             JOIN campaigns c ON q.campaign_id = c.id
             WHERE q.message_id = ?
             LIMIT 1`,
            [messageId]
        );

        if (rows.length > 0 && rows[0].webhook_url) {
            const { campaign_id, webhook_url, phone_number } = rows[0];
            const payload = {
                campaign_id,
                recipient: phone_number,
                message_id: messageId,
                status,
                reason: errorMsg
            };

            logger.info(
                { messageId, status, webhookUrl: webhook_url },
                'Sending DLR webhook notification'
            );

            const fetch = require('node-fetch');
            await fetch(webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => {
                logger.error(
                    { messageId, status, webhookUrl: webhook_url, error: err.message },
                    'Fetch callback error'
                );
            });
        }
    } catch (err) {
        logger.error(
            { messageId, status, error: err.message },
            'Failed to process webhook notification'
        );
    }
};

const notifyMessageWebhook = async (sessionName, msg) => {
    const webhookUrl = process.env.GLOBAL_WEBHOOK_URL || process.env.INCOMING_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.debug({ sessionName, messageId: msg.key?.id }, 'No GLOBAL_WEBHOOK_URL configured, skipping webhook forwarding');
        return;
    }

    try {
        const jid = msg.key?.remoteJid;
        const cleanPhone = jid ? jid.split('@')[0] : '';
        const text = chatStore.getMessageText(msg.message);

        const payload = {
            event: msg.key?.fromMe ? "message.outgoing" : "message.incoming",
            sessionName,
            phone: cleanPhone,
            message: {
                id: msg.key?.id,
                fromMe: msg.key?.fromMe || false,
                text: text,
                timestamp: msg.messageTimestamp ? parseInt(msg.messageTimestamp) : Math.floor(Date.now() / 1000),
                raw: msg
            }
        };

        logger.info(
            { sessionName, messageId: msg.key?.id, webhookUrl, event: payload.event },
            'Sending message webhook notification'
        );

        const fetch = require('node-fetch');
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => {
            logger.error(
                { sessionName, messageId: msg.key?.id, webhookUrl, error: err.message },
                'Message webhook delivery fetch error'
            );
        });
    } catch (err) {
        logger.error(
            { sessionName, messageId: msg.key?.id, error: err.message },
            'Failed to dispatch message webhook notification'
        );
    }
};

const createSession = async (sessionName, phoneNumber = null) => {

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
            DisconnectReason,
            Browsers
        } = await getBaileys();

        // If phone number is provided, ensure we start from a clean auth state by deleting the old session folder
        if (phoneNumber) {
            const fs = require('fs');
            const path = require('path');
            const sessionPath = path.join(process.cwd(), 'session', sessionName);
            if (fs.existsSync(sessionPath)) {
                try {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    logger.info({ sessionName }, 'Cleared old session folder for fresh pairing code request');
                } catch (e) {
                    logger.error({ sessionName, error: e.message }, 'Failed to clear old session folder');
                }
            }
        }

        const { state, saveCreds } =
            await useMultiFileAuthState(`session/${sessionName}`);

        const sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: true
        });

        // Store session
        session[sessionName] = {
            id: null,
            sessionName,
            sock,
            connected: false,
            reconnecting: false,
            qr: null,
            pairingCode: null,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            messageCount: 0,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

        // Save creds
        sock.ev.on('creds.update', saveCreds);

        // If phone number is provided and credentials are not registered, request pairing code
        if (phoneNumber && !sock.authState.creds.registered) {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            setTimeout(async () => {
                try {
                    logger.info({ sessionName, cleanPhone }, 'Requesting pairing code from WhatsApp');
                    const code = await sock.requestPairingCode(cleanPhone);
                    if (session[sessionName]) {
                        session[sessionName].pairingCode = code;
                        logger.info({ sessionName, cleanPhone, code }, 'Pairing code generated successfully');
                    }
                } catch (err) {
                    logger.error({ sessionName, cleanPhone, error: err.message }, 'Failed to request pairing code');
                }
            }, 1500);
        }

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

                    // Failed (status 0)
                    if (
                        update.update?.status === 0
                    ) {

                        logger.info(
                            {
                                sessionName,
                                messageId: update.key?.id
                            },
                            'Message failed'
                        );

                        if (update.key?.id) {
                            (async () => {
                                try {
                                    // Update campaign_queue with failed status
                                    await dbConnection.query(
                                        `UPDATE campaign_queue 
                                         SET queue_status = 'failed', failed_at = NOW(), error_message = 'Failed on WhatsApp gateway', updated_at = NOW() 
                                         WHERE message_id = ?`,
                                        [update.key.id]
                                    );
                                    
                                    // Update message_logs
                                    await dbConnection.query(
                                        `UPDATE message_logs 
                                         SET delivery_status = 'failed' 
                                         WHERE message_id = ?`,
                                        [update.key.id]
                                    );

                                    // Notify portal webhook
                                    await notifyWebhook(update.key.id, 'failed', 'Failed on WhatsApp gateway');
                                } catch (dbError) {
                                    logger.error(
                                        { 
                                            messageId: update.key.id, 
                                            error: dbError.message
                                        },
                                        'Failed to update fail status in database'
                                    );
                                }
                            })();
                        }
                    }

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

                                    // Notify portal webhook
                                    await notifyWebhook(update.key.id, 'delivered');
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

                                    // Notify portal webhook
                                    await notifyWebhook(update.key.id, 'read');
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

        // Message upsert (incoming & outgoing messages)
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const { messages, type } = m;
                logger.info(
                    { sessionName, type, count: messages.length },
                    'Message upsert event received'
                );

                for (const msg of messages) {
                    // Ignore protocol messages, status broadcast, etc.
                    if (!msg.message || msg.key?.remoteJid === 'status@broadcast') {
                        continue;
                    }

                    // Save message to chat store
                    chatStore.addMessage(sessionName, msg);

                    // Send webhook notification
                    await notifyMessageWebhook(sessionName, msg);
                }
            } catch (upsertError) {
                logger.error(
                    { sessionName, error: upsertError.message },
                    'Message upsert event handling error'
                );
            }
        });

        // Messaging history set (initial sync of chats/messages when session connects)
        sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
            try {
                logger.info(
                    { sessionName, messageCount: messages?.length },
                    'Messaging history set event received'
                );

                if (messages && messages.length > 0) {
                    for (const msg of messages) {
                        if (!msg.message || msg.key?.remoteJid === 'status@broadcast') {
                            continue;
                        }
                        // Save message to chat store
                        chatStore.addMessage(sessionName, msg);
                    }
                }
            } catch (historyError) {
                logger.error(
                    { sessionName, error: historyError.message },
                    'Messaging history set event handling error'
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
        qr: session[key].qr ? true : false,
        pairingCode: session[key].pairingCode || null
    }));
};

const deleteSession = async (sessionName) => {
    try {
        if (session[sessionName]?.sock) {
            await session[sessionName].sock.end();
        }
        delete session[sessionName];
        chatStore.clearStoreFromMemory(sessionName);
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

const getChatMessages = (sessionName, phone) => {
    return chatStore.getChatsForPhone(sessionName, phone);
};

module.exports = {
    createSession,
    getSession,
    getAllSessions,
    deleteSession,
    startSessionCleanup,
    stopSessionCleanup,
    closeAllSessions,
    loadSavedSessions,
    getChatMessages
};
