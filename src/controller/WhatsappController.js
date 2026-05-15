const { createSession, getSession, getAllSessions, closeAllSessions, deleteSession } = require("../config/whatsapp/sessionManager");
const { createLogger } = require("../logger");
const { asyncHandler, AppError } = require("../errorMiddleware");

const logger = createLogger('whatsapp-controller');

const connectWhatsApp = asyncHandler(async (req, res) => {
    const { sessionName } = req.validatedData.body;

    try {
        // Check if session already exists
        const existingSession = getSession(sessionName);
        if (existingSession?.connected) {
            return res.status(200).json({
                success: true,
                message: 'Session already connected',
                sessionName,
                connected: true
            });
        }

        // Create new session
        const session = await createSession(sessionName);

        if (!session) {
            throw new AppError('Failed to create session', 500, 'SESSION_001');
        }

        // Wait for QR code generation (max 5 seconds)
        let qrReady = false;
        let retries = 0;
        const maxRetries = 50; // 5 seconds with 100ms intervals

        while (!qrReady && retries < maxRetries) {
            if (getSession(sessionName)?.qr) {
                qrReady = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        const currentSession = getSession(sessionName);

        logger.info(
            { sessionName, qrReady, userId: req.user?.id },
            'Session connection initiated'
        );

        return res.status(200).json({
            success: true,
            sessionName,
            qr: currentSession?.qr || null,
            connected: currentSession?.connected,
            message: qrReady ? 'Scan the QR code' : 'QR code generation in progress'
        });
    } catch (error) {
        logger.error(
            { error: error.message, sessionName, userId: req.user?.id },
            'Failed to connect WhatsApp'
        );
        throw error;
    }
});

const getSessions = asyncHandler(async (req, res) => {
    try {
        const sessions = getAllSessions();

        logger.debug(
            { sessionCount: sessions.length, userId: req.user?.id },
            'Sessions retrieved'
        );

        res.status(200).json({
            success: true,
            data: sessions,
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.connected).length
        });
    } catch (error) {
        logger.error(
            { error: error.message, userId: req.user?.id },
            'Failed to get sessions'
        );
        throw error;
    }
});

const logoutWhatsApp = asyncHandler(async (req, res) => {
    const { sessionName } = req.validatedData.body;

    try {
        const session = getSession(sessionName);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
                sessionName,
                code: 'SESSION_002'
            });
        }

        await deleteSession(sessionName);

        logger.info(
            { sessionName, userId: req.user?.id },
            'Session logout successful'
        );

        return res.status(200).json({
            success: true,
            message: 'Session logged out successfully',
            sessionName
        });
    } catch (error) {
        logger.error(
            { error: error.message, sessionName, userId: req.user?.id },
            'Failed to logout WhatsApp session'
        );
        throw error;
    }
});

module.exports = { connectWhatsApp, getSessions, logoutWhatsApp };
