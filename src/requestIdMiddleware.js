const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('./logger');

const logger = createLogger('request-middleware');

const requestIdMiddleware = (req, res, next) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.id);

    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(
            {
                requestId: req.id,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id
            },
            'Request completed'
        );
    });

    next();
};

module.exports = requestIdMiddleware;
