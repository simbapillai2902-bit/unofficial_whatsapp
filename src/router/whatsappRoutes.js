const express = require("express");
const WhatsappController = require("../controller/WhatsappController.js");
const { validateRequest, connectWhatsAppSchema, logoutWhatsAppSchema } = require("../validationMiddleware");
const router = express.Router();

router.post(
    '/connect',
    validateRequest(connectWhatsAppSchema),
    WhatsappController.connectWhatsApp
);

router.get('/sessions', WhatsappController.getSessions);

router.post(
    '/logout',
    validateRequest(logoutWhatsAppSchema),
    WhatsappController.logoutWhatsApp
);

module.exports = router;
