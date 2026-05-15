const mysql = require('mysql2/promise');
const config = require('./config.js');
const { createLogger } = require('../logger.js');

const logger = createLogger('db-config');

require('dotenv').config();

const dbConnection = mysql.createPool({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASS,
    database: config.DB_NAME,
    port: config.DB_PORT || 3306,
    // Connection pool configuration for production
    waitForConnections: true,
    connectionLimit: parseInt(config.DB_POOL_MAX) || 20,
    queueLimit: 0,
    enableKeepAlive: config.DB_ENABLE_KEEP_ALIVE !== 'false',
    keepAliveInitialDelayMs: 0,
    connectionTimeZone: '+00:00',
    decimalNumbers: true,
    supportBigNumbers: true,
    timezone: 'Z'
});

// Test connection on startup
dbConnection.getConnection()
    .then(conn => {
        logger.info('Database connection pool initialized successfully');
        conn.release();
    })
    .catch(err => {
        logger.error({ error: err.message }, 'Failed to initialize database connection pool');
        process.exit(1);
    });

dbConnection.on('error', (err) => {
    logger.error({ error: err.message, code: err.code }, 'Database connection error');
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.error('Database connection was closed.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        logger.error('Database had a fatal error.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_CLOSE') {
        logger.error('Database connection was manually closed.');
    }
});

module.exports = dbConnection;