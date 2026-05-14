const express = require("express");
const dbConnection = require("../config/dbConnection.js");
const { createLogger } = require("../logger");

const logger = createLogger('health-routes');
const router = express.Router();

router.get('/health', async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Health check failed');
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

router.get('/ready', async (req, res) => {
    try {
        // Check database
        const connection = await dbConnection.getConnection();
        await connection.query('SELECT 1');
        connection.release();

        logger.debug('Readiness check passed');

        res.status(200).json({
            success: true,
            status: 'ready',
            dependencies: {
                database: 'connected'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Readiness check failed');
        res.status(503).json({
            success: false,
            status: 'not-ready',
            dependencies: {
                database: error.message.includes('database') ? 'failed' : 'ok'
            },
            error: error.message
        });
    }
});

module.exports = router;
