const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const P = require("pino");
const qrcode = require("qrcode");
const { createLogger } = require("../../logger");

const logger = createLogger('session-manager');

const session = {};
let sessionCleanupInterval = null;

const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MS) || 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000;
const MAX_SESSIONS = parseInt(process.env.MAX_ACTIVE_SESSIONS) || 100;

const createSession = async (sessionName) => {
    try {
        // Check session limit
        if (Object.keys(session).length >= MAX_SESSIONS) {
            throw new Error(`Maximum active sessions (${MAX_SESSIONS}) reached`);
        }

        if (session[sessionName]?.sock) {
            logger.warn({ sessionName }, 'Session already exists, closing old session');
            try {
                session[sessionName].sock.end();
            } catch (e) {
                logger.error({ error: e.message }, 'Error closing old session');
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(`session/${sessionName}`);

        const sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' })
        });

        session[sessionName] = {
            sock,
            connected: false,
            qr: null,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            messageCount: 0,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;

            if (qr) {
                try {
                    const qrImage = await qrcode.toDataURL(qr);
                    session[sessionName].qr = qrImage;
                    logger.info({ sessionName }, 'QR code generated');
                } catch (error) {
                    logger.error({ error: error.message, sessionName }, 'Error generating QR code');
                }
            }

            if (connection === 'open') {
                session[sessionName].connected = true;
                session[sessionName].reconnectAttempts = 0;
                logger.info({ sessionName }, 'Session connected');
            }

            if (connection === 'close') {
                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !==
                    DisconnectReason.loggedOut;

                if (shouldReconnect && session[sessionName]?.reconnectAttempts < session[sessionName]?.maxReconnectAttempts) {
                    session[sessionName].reconnectAttempts++;
                    session[sessionName].connected = false;
                    logger.info(
                        { sessionName, attempt: session[sessionName].reconnectAttempts },
                        'Attempting to reconnect'
                    );
                    
                    // Wait before reconnecting
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    createSession(sessionName);
                } else {
                    logger.warn({ sessionName }, 'Max reconnection attempts reached or logged out');
                    // Clean up session
                    delete session[sessionName];
                }
            }
        });

        logger.info({ sessionName }, 'Session created');
        return session[sessionName];
    } catch (error) {
        logger.error({ error: error.message, sessionName }, 'Failed to create session');
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
        connected: session[key].connected,
        createdAt: session[key].createdAt,
        lastActivity: session[key].lastActivity,
        qr: session[key].qr ? true : false // Don't expose actual QR data
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
    closeAllSessions
};
