const { asyncHandler, AppError } = require("../errorMiddleware");
const { createLogger } = require("../logger");
const {
    getMessageReadStatus,
    getMessageReadCount,
    getMessageReadByUsers,
    getMessagePendingReadUsers,
    getCampaignReadSummary,
    getCampaignMessagesReadStatus,
    markMessageAsRead,
    getMessageReadHistory
} = require("../service/messageReadStatusService");

const logger = createLogger('message-read-status-controller');

/**
 * GET /api/message/:messageId/read-status
 * Get individual message read status
 */
const getMessageStatus = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    logger.info({ messageId }, 'Fetching message status');

    const messageStatus = await getMessageReadStatus(messageId);
    
    if (!messageStatus) {
        throw new AppError('Message not found', 404, 'MSG_001');
    }

    res.status(200).json({
        success: true,
        data: messageStatus
    });
});

/**
 * GET /api/message/:messageId/read-count
 * Get total count of users who read the message
 */
const getReadCount = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    logger.info({ messageId }, 'Fetching read count');

    const readCount = await getMessageReadCount(messageId);

    if (!readCount) {
        throw new AppError('Message not found', 404, 'MSG_002');
    }

    res.status(200).json({
        success: true,
        data: readCount
    });
});

/**
 * GET /api/message/:messageId/read-users
 * Get list of all users who read this message
 */
const getReadUsers = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    logger.info({ messageId }, 'Fetching users who read the message');

    const readUsers = await getMessageReadByUsers(messageId);

    res.status(200).json({
        success: true,
        data: {
            message_id: messageId,
            total_read_count: readUsers.length,
            read_by: readUsers
        }
    });
});

/**
 * GET /api/message/:messageId/pending-read
 * Get list of users with pending read status (delivered but not read)
 */
const getPendingRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    logger.info({ messageId }, 'Fetching pending read users');

    const pendingUsers = await getMessagePendingReadUsers(messageId);

    res.status(200).json({
        success: true,
        data: {
            message_id: messageId,
            pending_read_count: pendingUsers.length,
            pending_read: pendingUsers
        }
    });
});

/**
 * GET /api/message/:messageId/read-history
 * Get detailed read history with timestamps
 */
const getReadHistory = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    logger.info({ messageId }, 'Fetching read history');

    const history = await getMessageReadHistory(messageId);

    res.status(200).json({
        success: true,
        data: {
            message_id: messageId,
            total_reads: history.length,
            history: history
        }
    });
});

/**
 * GET /api/message/:messageId/complete-status
 * Get complete status with read users, pending users, and statistics
 */
const getCompleteStatus = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    logger.info({ messageId }, 'Fetching complete message status');

    const [readCount, readUsers, pendingUsers] = await Promise.all([
        getMessageReadCount(messageId),
        getMessageReadByUsers(messageId),
        getMessagePendingReadUsers(messageId)
    ]);

    if (!readCount) {
        throw new AppError('Message not found', 404, 'MSG_003');
    }

    res.status(200).json({
        success: true,
        data: {
            ...readCount,
            read_by: readUsers,
            pending_read: pendingUsers
        }
    });
});

/**
 * GET /api/campaign/:campaignId/read-summary
 * Get campaign-wide read statistics
 */
const getCampaignSummary = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    logger.info({ campaignId }, 'Fetching campaign read summary');

    const summary = await getCampaignReadSummary(campaignId);

    if (!summary) {
        throw new AppError('Campaign not found or has no messages', 404, 'CAMP_001');
    }

    res.status(200).json({
        success: true,
        data: summary
    });
});

/**
 * GET /api/campaign/:campaignId/messages-read-status
 * Get all messages of a campaign with read status
 */
const getCampaignMessages = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    logger.info({ campaignId, limit, offset }, 'Fetching campaign messages with read status');

    const messages = await getCampaignMessagesReadStatus(
        campaignId,
        parseInt(limit),
        parseInt(offset)
    );

    res.status(200).json({
        success: true,
        data: {
            campaign_id: campaignId,
            total_messages: messages.length,
            messages: messages
        }
    });
});

/**
 * POST /api/message/:messageId/mark-read
 * Manually mark a message as read by a recipient
 */
const markAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { phone_number } = req.body;

    logger.info({ messageId, phoneNumber: phone_number }, 'Marking message as read');

    if (!phone_number) {
        throw new AppError('phone_number is required', 400, 'VAL_001');
    }

    const marked = await markMessageAsRead(messageId, phone_number);

    if (!marked) {
        throw new AppError(
            'Message not found or already read',
            404,
            'MSG_004'
        );
    }

    res.status(200).json({
        success: true,
        message: 'Message marked as read successfully',
        data: {
            message_id: messageId,
            recipient_phone: phone_number,
            marked_at: new Date().toISOString()
        }
    });
});

/**
 * GET /api/campaign/:campaignId/read-analytics
 * Get detailed analytics for a campaign including breakdowns
 */
const getCampaignAnalytics = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    logger.info({ campaignId }, 'Fetching campaign analytics');

    const summary = await getCampaignReadSummary(campaignId);

    if (!summary) {
        throw new AppError('Campaign not found or has no messages', 404, 'CAMP_002');
    }

    // Calculate percentages
    const totalMessages = summary.total_messages || 1;
    const analytics = {
        campaign_id: campaignId,
        summary: summary,
        breakdowns: {
            read_percentage: ((summary.read_count / totalMessages) * 100).toFixed(2),
            delivered_percentage: ((summary.delivered_count / totalMessages) * 100).toFixed(2),
            sent_percentage: ((summary.sent_count / totalMessages) * 100).toFixed(2),
            pending_percentage: ((summary.pending_count / totalMessages) * 100).toFixed(2),
            failed_percentage: ((summary.failed_count / totalMessages) * 100).toFixed(2)
        }
    };

    res.status(200).json({
        success: true,
        data: analytics
    });
});

module.exports = {
    getMessageStatus,
    getReadCount,
    getReadUsers,
    getPendingRead,
    getReadHistory,
    getCompleteStatus,
    getCampaignSummary,
    getCampaignMessages,
    markAsRead,
    getCampaignAnalytics
};
