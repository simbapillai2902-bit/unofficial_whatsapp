const pino = require('pino');

const pinoTransport = pino.transport({
    target: 'pino-pretty',
    options: {
        colorize: process.env.NODE_ENV !== 'production',
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
    },
});

const logger = pino(
    {
        level: process.env.LOG_LEVEL || 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    process.env.NODE_ENV === 'production' ? undefined : pinoTransport
);

const createLogger = (module) => {
    return logger.child({ module });
};

module.exports = { logger, createLogger };
