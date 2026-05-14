const { createLogger } = require('./logger.js');

const logger = createLogger('error-middleware');

class AppError extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

const errorHandler = (err, req, res, next) => {
    const requestId = req.id || 'unknown';

    if (err instanceof AppError) {
        logger.error(
            {
                requestId,
                error: err.message,
                code: err.code,
                statusCode: err.statusCode,
                path: req.path,
                method: req.method
            },
            'Application error'
        );

        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
            requestId,
            timestamp: err.timestamp
        });
    }

    // Database errors
    if (err.code === 'ER_DUP_ENTRY') {
        logger.warn({ requestId, error: err.message }, 'Duplicate entry error');
        return res.status(409).json({
            success: false,
            error: 'Resource already exists',
            code: 'DB_001',
            requestId
        });
    }

    if (err.code && err.code.startsWith('ER_')) {
        logger.error({ requestId, code: err.code, error: err.message }, 'Database error');
        return res.status(500).json({
            success: false,
            error: 'Database error occurred',
            code: 'DB_002',
            requestId
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        logger.warn({ requestId, error: err.message }, 'JWT error');
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'AUTH_004',
            requestId
        });
    }

    // Timeout errors
    if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
        logger.error({ requestId, error: err.message }, 'Timeout error');
        return res.status(504).json({
            success: false,
            error: 'Request timeout',
            code: 'TIMEOUT_001',
            requestId
        });
    }

    // Generic error
    logger.error(
        {
            requestId,
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        },
        'Unhandled error'
    );

    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        code: 'INTERNAL_ERROR',
        requestId
    });
};

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};
