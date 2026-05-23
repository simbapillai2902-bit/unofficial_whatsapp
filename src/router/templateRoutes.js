const express = require("express");
const templateController = require("../controller/templateController.js");
const { validateRequest, saveTemplateSchema, updateTemplateSchema, deleteTemplateSchema } = require("../validationMiddleware");
const router = express.Router();

// Save/Create template
router.post(
    '/save',
    validateRequest(saveTemplateSchema),
    templateController.saveTemplate
);

// Get all templates for a user
router.get(
    '/templates/user/:user_id',
    templateController.getTemplatesByUser
);

// Get specific template
router.get(
    '/templates/:template_id',
    templateController.getTemplateById
);

// Update template
router.put(
    '/templates/:template_id',
    validateRequest(updateTemplateSchema),
    templateController.updateTemplate
);

// Delete template
router.delete(
    '/templates/:template_id',
    validateRequest(deleteTemplateSchema),
    templateController.deleteTemplate
);

module.exports = router;
