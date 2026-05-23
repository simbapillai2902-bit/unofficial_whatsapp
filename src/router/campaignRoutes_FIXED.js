/**
 * FIXED Campaign Routes - With proper workflow
 * 
 * Usage Order:
 * 1. POST /api/campaign/user/create
 * 2. POST /api/campaign/campaign/create  
 * 3. POST /api/campaign/add-contacts
 * 4. POST /api/campaign/start/:campaignId
 */

const express = require("express");
const campaignController = require("../controller/campaignController.js");
const router = express.Router();

// ============================================================================
// STEP 1: Create User
// ============================================================================
router.post(
    '/user/create',
    campaignController.createUser
);

// ============================================================================
// STEP 2: Create Campaign
// ============================================================================
router.post(
    '/campaign/create',
    campaignController.createCampaign
);

// ============================================================================
// STEP 3: Add Contacts to Campaign
// ============================================================================
router.post(
    '/add-contacts',
    campaignController.addCampaignContact
);

// ============================================================================
// Delete Contacts from Campaign
// ============================================================================
router.post(
    '/delete-contacts',
    campaignController.deleteCampaignContacts
);

// ============================================================================
// STEP 4: Start Campaign (Send Messages)
// ============================================================================
router.post(
    '/start/:campaignId',
    campaignController.startCampaign
);

// ============================================================================
// Get Campaign Status
// ============================================================================
router.get(
    '/:campaignId/status',
    campaignController.getCampaignProgressStatus
);

module.exports = router;
