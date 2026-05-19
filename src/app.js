const express = require("express");
const cors = require("cors");
const { createLogger } = require('./logger');
const requestIdMiddleware = require('./requestIdMiddleware');
const { errorHandler } = require('./errorMiddleware');
const whatsappRoutes = require('./router/whatsappRoutes.js');
const campaignRoutes = require('./router/campaignRoutes.js');
const templateRoutes = require('./router/templateRoutes.js');
const healthRoutes = require('./router/healthRoutes.js');

const logger = createLogger('app');
const app = express();

// Middleware for parsing
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS Configuration (P0 - Security)
app.use(cors({
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
    methods: (process.env.ALLOWED_METHODS || 'GET,POST,PUT,DELETE').split(','),
    allowedHeaders: (process.env.ALLOWED_HEADERS || 'Content-Type,Authorization').split(','),
    maxAge: 3600
}));

// Request ID middleware (P1 - Logging)
app.use(requestIdMiddleware);

// Health check routes (no auth required) (P1)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Request timeout middleware (P1 - Stability)
app.use((req, res, next) => {
    res.setTimeout(
        parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
        () => {
            logger.error(
                { requestId: req.id, path: req.path },
                'Request timeout'
            );
            res.status(408).json({
                success: false,
                error: 'Request timeout',
                code: 'TIMEOUT_001',
                requestId: req.id
            });
        }
    );
    next();
});

// API Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/campaign', templateRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        code: 'NOT_FOUND',
        requestId: req.id
    });
});

// Global error handler (P1 - Stability)
app.use(errorHandler);

logger.info('Express app configured successfully');

module.exports = app;
