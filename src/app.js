const express = require("express");
const cors = require("cors");
const { createLogger } = require('./logger');
const requestIdMiddleware = require('./requestIdMiddleware');
const { errorHandler } = require('./errorMiddleware');
const whatsappRoutes = require('./router/whatsappRoutes.js');
const campaignRoutes = require('./router/campaignRoutes.js');
const templateRoutes = require('./router/templateRoutes.js');
const healthRoutes = require('./router/healthRoutes.js');
const messageReadStatusRoutes = require('./router/messageReadStatusRoutes.js');
const userManagementRoutes = require('./router/userManagementRoutes.js');

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

// ✅ API ROUTES - PROPER MAPPING FOR COMPLETE WORKFLOW

// ✅ PHASE 0: Server Health Check
app.use('/api/health', healthRoutes);

// ✅ PHASE 1: User Management Routes
// POST  /api/user/create     → Create User
// GET   /api/user/list       → List All Users
// GET   /api/user/:userId    → Get User By ID
app.use('/api/user', userManagementRoutes);

// ✅ PHASE 2-6: Campaign Management Routes
// POST  /api/campaign/create                 → Create Campaign
// GET   /api/campaign/list                   → List All Campaigns
// GET   /api/campaign/:campaignId            → Get Campaign By ID
// POST  /api/campaign/add-contacts           → Add Contacts (PHASE 3)
// GET   /api/campaign/:campaignId/contacts   → Get Contacts (PHASE 3)
// POST  /api/campaign/delete-contacts        → Delete Contacts (PHASE 3)
// POST  /api/campaign/start/:campaignId      → Start Campaign (PHASE 4)
// GET   /api/campaign/:campaignId/status     → Get Status (PHASE 5)
// GET   /api/campaign/:campaignId/read-status → Get Read Status (PHASE 5)
// GET   /api/campaign/:campaignId/analytics  → Get Analytics (PHASE 6)
app.use('/api/campaign', campaignRoutes);

// WhatsApp and other routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/message', messageReadStatusRoutes);
app.use('/api/template', templateRoutes);

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
logger.info('✅ API Routes Configured:');
logger.info('   PHASE 1: POST /api/user/create, GET /api/user/list, GET /api/user/:userId');
logger.info('   PHASE 2: POST /api/campaign/create, GET /api/campaign/list');
logger.info('   PHASE 3: POST /api/campaign/add-contacts, GET /api/campaign/:campaignId/contacts');
logger.info('   PHASE 4: POST /api/campaign/start/:campaignId');
logger.info('   PHASE 5: GET /api/campaign/:campaignId/status, GET /api/campaign/:campaignId/read-status');
logger.info('   PHASE 6: GET /api/campaign/:campaignId/analytics');

module.exports = app;
