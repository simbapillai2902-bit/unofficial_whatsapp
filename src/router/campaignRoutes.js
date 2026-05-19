const express = require("express");
const campaignController = require("../controller/campaignController.js");
const { validateRequest, addCampaignContactSchema, startCampaignSchema, deleteCampaignContactSchema } = require("../validationMiddleware");
const router = express.Router();

router.post(
    '/add-contacts',
    validateRequest(addCampaignContactSchema),
    campaignController.addCampaignContact
);

router.post(
    '/delete-contacts',
    validateRequest(deleteCampaignContactSchema),
    campaignController.deleteCampaignContacts
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
