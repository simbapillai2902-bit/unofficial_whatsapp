require('dotenv').config();
const app = require("./src/app.js");
const config = require("./src/config/config.js");
require("./src/config/dbConnection.js");
const { startSessionCleanup, closeAllSessions } = require("./src/config/whatsapp/sessionManager");
const { createLogger } = require("./src/logger.js");

const logger = createLogger('server');

let server = null;

const startServer = async () => {
    try {
        // Start session cleanup
        startSessionCleanup();
        logger.info('Session cleanup started');

        // Start server
        server = app.listen(config.PORT, () => {
            logger.info({ port: config.PORT }, `Server is running`);
        });

        // Graceful shutdown handlers (P1)
        const gracefulShutdown = async (signal) => {
            logger.info({ signal }, 'Graceful shutdown initiated');

            const shutdownTimeout = setTimeout(() => {
                logger.error('Graceful shutdown timeout exceeded, forcing exit');
                process.exit(1);
            }, parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS) || 30000);

            try {
                // Close server
                if (server) {
                    server.close(() => {
                        logger.info('Server closed');
                    });
                }

                // Close all sessions
                await closeAllSessions();

                clearTimeout(shutdownTimeout);
                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error({ error: error.message }, 'Error during graceful shutdown');
                clearTimeout(shutdownTimeout);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions (P0 - Stability)
        process.on('uncaughtException', (error) => {
            logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
            process.exit(1);
        });

        // Handle unhandled rejections (P0 - Stability)
        process.on('unhandledRejection', (reason, promise) => {
            logger.error({ reason, promise }, 'Unhandled rejection');
            process.exit(1);
        });

    } catch (error) {
        logger.error({ error: error.message }, 'Failed to start server');
        process.exit(1);
    }
};

startServer();

module.exports = server;

