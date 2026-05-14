const express = require("express");
const campaignController = require("../controller/campaignController.js");
const { validateRequest, addCampaignContactSchema, startCampaignSchema } = require("../validationMiddleware");
const router = express.Router();

router.post(
    '/add-contacts',
    validateRequest(addCampaignContactSchema),
    campaignController.addCampaignContact
);

router.post(
    '/start/:campaignId',
    validateRequest(startCampaignSchema),
    campaignController.startCampaign
);

router.get(
    '/campaign/:campaignId/status',
    campaignController.getCampaignProgressStatus
);

router.get(
    '/job/:jobId/status',
    campaignController.getJobStatus
);

module.exports = router;
