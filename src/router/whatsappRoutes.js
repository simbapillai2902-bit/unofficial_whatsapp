const express = require("express");
const WhatsappController = require("../controller/WhatsappController.js");
const { validateRequest, connectWhatsAppSchema } = require("../validationMiddleware");
const router = express.Router();

router.post(
    '/connect',
    validateRequest(connectWhatsAppSchema),
    WhatsappController.connectWhatsApp
);

router.get('/sessions', WhatsappController.getSessions);

module.exports = router;
