const Joi = require('joi');
const { createLogger } = require('./logger.js');

const logger = createLogger('validation-middleware');

const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const { error, value } = schema.validate(
                {
                    body: req.body,
                    params: req.params,
                    query: req.query,
                },
                {
                    abortEarly: false,
                    stripUnknown: true,
                }
            );

            if (error) {
                const details = error.details.map(d => ({
                    field: d.path.join('.'),
                    message: d.message
                }));

                logger.warn(
                    { details, path: req.path },
                    'Validation failed'
                );

                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_001',
                    details
                });
            }

            req.validatedData = value;
            next();
        } catch (err) {
            logger.error({ error: err.message }, 'Validation middleware error');
            res.status(500).json({
                success: false,
                error: 'Validation error',
                code: 'VALIDATION_002'
            });
        }
    };
};

// Campaign Validation Schemas
const addCampaignContactSchema = Joi.object({
    body: Joi.object({
        campaign_id: Joi.number().integer().required().messages({
            'number.base': 'campaign_id must be a number',
            'any.required': 'campaign_id is required'
        }),
        user_id: Joi.number().integer().required().messages({
            'number.base': 'user_id must be a number',
            'any.required': 'user_id is required'
        }),
        contacts: Joi.array()
            .items(
                Joi.string()
                    .pattern(/^[1-9]\d{9,14}$/)
                    .required()
            )
            .max(1000)
            .min(1)
            .required()
            .messages({
                'array.max': 'Maximum 1000 contacts allowed per request',
                'array.min': 'At least 1 contact required',
                'string.pattern.base': 'Each contact must be a valid phone number (10-15 digits)'
            })
    }).unknown(false).required()
});

const startCampaignSchema = Joi.object({
    body: Joi.object({
        messageTemplate: Joi.string().min(1).max(4096).required().messages({
            'string.empty': 'messageTemplate cannot be empty',
            'string.max': 'Message too long (max 4096 characters)',
            'any.required': 'messageTemplate is required'
        })
    }).unknown(false).required(),
    params: Joi.object({
        campaignId: Joi.number().integer().required()
    }).unknown(false).required()
});

const connectWhatsAppSchema = Joi.object({
    body: Joi.object({
        sessionName: Joi.string()
            .alphanum()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.alphanum': 'Session name must contain only alphanumeric characters',
                'string.min': 'Session name must be at least 3 characters',
                'string.max': 'Session name cannot exceed 50 characters'
            })
    }).unknown(false).required()
});

module.exports = {
    validateRequest,
    addCampaignContactSchema,
    startCampaignSchema,
    connectWhatsAppSchema
};
