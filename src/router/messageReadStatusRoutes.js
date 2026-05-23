const express = require("express");
const messageReadStatusController = require("../controller/messageReadStatusController.js");
const router = express.Router();

/**
 * Message-specific read status endpoints
 */

// Get status of a single message
router.get('/:messageId/read-status', messageReadStatusController.getMessageStatus);

// Get read count and statistics for a message
router.get('/:messageId/read-count', messageReadStatusController.getReadCount);

// Get list of users who read the message
router.get('/:messageId/read-users', messageReadStatusController.getReadUsers);

// Get list of users with pending read (delivered but not read)
router.get('/:messageId/pending-read', messageReadStatusController.getPendingRead);

// Get detailed read history
router.get('/:messageId/read-history', messageReadStatusController.getReadHistory);

// Get complete status (all info in one endpoint)
router.get('/:messageId/complete-status', messageReadStatusController.getCompleteStatus);

// Mark a message as read manually
router.post('/:messageId/mark-read', messageReadStatusController.markAsRead);

/**
 * Campaign-wide read status endpoints
 */

// Get campaign read summary
router.get('/campaign/:campaignId/read-summary', messageReadStatusController.getCampaignSummary);

// Get all messages of a campaign with read status
router.get('/campaign/:campaignId/messages-read-status', messageReadStatusController.getCampaignMessages);

// Get detailed analytics for a campaign
router.get('/campaign/:campaignId/read-analytics', messageReadStatusController.getCampaignAnalytics);

module.exports = router;
