const dbConnection = require("../config/dbConnection.js");
const { createLogger } = require("../logger");
const { asyncHandler, AppError } = require("../errorMiddleware");

const logger = createLogger('template-controller');

const saveTemplate = asyncHandler(async (req, res) => {
    const { user_id, template_name, template_type, template_content, variables, preview_text, template_data } = req.validatedData.body;

    try {
        // Check if template with same name already exists for this user
        const [existing] = await dbConnection.query(
            `SELECT id FROM message_templates WHERE user_id = ? AND template_name = ?`,
            [user_id, template_name]
        );

        if (existing.length > 0) {
            throw new AppError('Template with this name already exists', 409, 'TEMPLATE_002');
        }

        // Insert template
        const [result] = await dbConnection.query(
            `INSERT INTO message_templates (user_id, template_name, template_type, template_content, variables, preview_text, template_data, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [user_id, template_name, template_type, template_content, JSON.stringify(variables || []), preview_text, JSON.stringify(template_data || {})]
        );

        logger.info(
            { userId: user_id, templateId: result.insertId, templateName: template_name },
            'Template saved successfully'
        );

        res.status(201).json({
            success: true,
            message: 'Template saved successfully',
            templateId: result.insertId,
            templateName: template_name,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error(
            { error: error.message, userId: user_id, templateName: template_name },
            'Failed to save template'
        );
        throw error;
    }
});

const getTemplatesByUser = asyncHandler(async (req, res) => {
    const { user_id } = req.params;

    try {
        const [templates] = await dbConnection.query(
            `SELECT id, user_id, template_name, template_type, template_content, variables, preview_text, is_active, usage_count, created_at, updated_at
             FROM message_templates 
             WHERE user_id = ? AND is_active = 1
             ORDER BY created_at DESC`,
            [user_id]
        );

        logger.debug({ userId: user_id, count: templates.length }, 'Templates retrieved');

        res.status(200).json({
            success: true,
            data: templates.map(t => ({
                ...t,
                variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : t.variables
            })),
            total: templates.length,
            userId: user_id
        });
    } catch (error) {
        logger.error(
            { error: error.message, userId: user_id },
            'Failed to get templates'
        );
        throw error;
    }
});

const getTemplateById = asyncHandler(async (req, res) => {
    const { template_id } = req.params;

    try {
        const [templates] = await dbConnection.query(
            `SELECT * FROM message_templates WHERE id = ? AND is_active = 1`,
            [template_id]
        );

        if (templates.length === 0) {
            throw new AppError('Template not found', 404, 'TEMPLATE_001');
        }

        const template = templates[0];
        
        logger.debug({ templateId: template_id }, 'Template retrieved');

        res.status(200).json({
            success: true,
            data: {
                ...template,
                variables: typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables,
                template_data: typeof template.template_data === 'string' ? JSON.parse(template.template_data) : template.template_data
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, templateId: template_id },
            'Failed to get template'
        );
        throw error;
    }
});

const updateTemplate = asyncHandler(async (req, res) => {
    const { template_id } = req.params;
    const { user_id, template_name, template_type, template_content, variables, preview_text, is_active, template_data } = req.validatedData.body;

    try {
        // Check if template exists and belongs to user
        const [existing] = await dbConnection.query(
            `SELECT user_id FROM message_templates WHERE id = ?`,
            [template_id]
        );

        if (existing.length === 0) {
            throw new AppError('Template not found', 404, 'TEMPLATE_001');
        }

        if (existing[0].user_id !== user_id) {
            throw new AppError('Unauthorized: You can only update your own templates', 403, 'TEMPLATE_003');
        }

        // Update template
        await dbConnection.query(
            `UPDATE message_templates 
             SET template_name = ?, template_type = ?, template_content = ?, variables = ?, preview_text = ?, is_active = ?, template_data = ?, updated_at = NOW()
             WHERE id = ?`,
            [template_name, template_type, template_content, JSON.stringify(variables || []), preview_text, is_active ? 1 : 0, JSON.stringify(template_data || {}), template_id]
        );

        logger.info(
            { userId: user_id, templateId: template_id },
            'Template updated successfully'
        );

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            templateId: template_id,
            templateName: template_name,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error(
            { error: error.message, templateId: template_id, userId: user_id },
            'Failed to update template'
        );
        throw error;
    }
});

const deleteTemplate = asyncHandler(async (req, res) => {
    const { template_id } = req.params;
    const { user_id } = req.validatedData.body;

    try {
        // Check if template exists and belongs to user
        const [existing] = await dbConnection.query(
            `SELECT user_id FROM message_templates WHERE id = ?`,
            [template_id]
        );

        if (existing.length === 0) {
            throw new AppError('Template not found', 404, 'TEMPLATE_001');
        }

        if (existing[0].user_id !== user_id) {
            throw new AppError('Unauthorized: You can only delete your own templates', 403, 'TEMPLATE_003');
        }

        // Soft delete - set is_active to 0
        await dbConnection.query(
            `UPDATE message_templates SET is_active = 0, updated_at = NOW() WHERE id = ?`,
            [template_id]
        );

        logger.info(
            { userId: user_id, templateId: template_id },
            'Template deleted successfully'
        );

        res.status(200).json({
            success: true,
            message: 'Template deleted successfully',
            templateId: template_id
        });
    } catch (error) {
        logger.error(
            { error: error.message, templateId: template_id, userId: user_id },
            'Failed to delete template'
        );
        throw error;
    }
});

module.exports = {
    saveTemplate,
    getTemplatesByUser,
    getTemplateById,
    updateTemplate,
    deleteTemplate
};
