const express = require("express");
const campaignController = require("../controller/campaignController.js");
const { validateRequest, createCampaignSchema, addCampaignContactSchema, startCampaignSchema, deleteCampaignContactSchema } = require("../validationMiddleware");
const router = express.Router();

// ✅ Create Campaign (PHASE 2)
// POST /api/campaign/create
// Requires: user_id, campaign_name, campaign_description (optional)
router.post('/create', validateRequest(createCampaignSchema), campaignController.createCampaign);

// ✅ Get All Campaigns (PHASE 2)
// GET /api/campaign/list
router.get('/list', campaignController.getAllCampaigns);

// ✅ Get Campaign By ID (PHASE 2)
// GET /api/campaign/:campaignId
router.get('/:campaignId', campaignController.getCampaignById);

// ✅ Add Contacts to Campaign (PHASE 3)
// POST /api/campaign/add-contacts
// Requires: campaign_id, user_id, contacts (array of phone numbers)
router.post(
    '/add-contacts',
    validateRequest(addCampaignContactSchema),
    campaignController.addCampaignContact
);

// ✅ Get Contacts in Campaign (PHASE 3)
// GET /api/campaign/:campaignId/contacts
router.get('/:campaignId/contacts', campaignController.getCampaignContacts);

// ✅ Delete Contacts from Campaign (PHASE 3)
// POST /api/campaign/delete-contacts
router.post(
    '/delete-contacts',
    validateRequest(deleteCampaignContactSchema),
    campaignController.deleteCampaignContacts
);

// ✅ Start Campaign (PHASE 4)
// POST /api/campaign/start/:campaignId
// Triggers message sending
router.post(
    '/start/:campaignId',
    validateRequest(startCampaignSchema),
    campaignController.startCampaign
);

// ✅ Get Campaign Status (PHASE 5)
// GET /api/campaign/:campaignId/status
// Real-time message breakdown (pending, sent, delivered, read)
router.get(
    '/:campaignId/status',
    campaignController.getCampaignDetailedStatus
);

// ✅ Get Campaign Read Status (PHASE 5)
// GET /api/campaign/:campaignId/read-status
// Detailed information about which messages were read
router.get(
    '/:campaignId/read-status',
    campaignController.getCampaignReadStatus
);

// ✅ Get Campaign Analytics (PHASE 6)
// GET /api/campaign/:campaignId/analytics
// Final campaign performance report (delivery rates, read rates, etc)
router.get(
    '/:campaignId/analytics',
    campaignController.getCampaignAnalytics
);

// ✅ Delete Campaign
// DELETE /api/campaign/:campaignId
router.delete('/:campaignId', campaignController.deleteCampaign);

module.exports = router;
