const Joi = require('joi');
const { createLogger } = require('./logger.js');

const logger = createLogger('validation-middleware');

const validateRequest = (schema) => {

    return async (req, res, next) => {

        try {

            // DEBUG: log exact incoming body to diagnose contact format issues
            if (req.path === '/add-contacts') {
                logger.info(
                    { body: JSON.stringify(req.body) },
                    'DEBUG add-contacts incoming body'
                );
            }

            const value = await schema.validateAsync(
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

            req.validatedData = value;

            return next();

        } catch (error) {

            if (error.details) {

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

            logger.error(
                { error: error.message },
                'Validation middleware error'
            );

            return res.status(500).json({
                success: false,
                error: error.message,
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
            .items(Joi.any())  // Accept any format: string, number, or object — controller handles sanitization
            .max(2000)
            .min(1)
            .required()
            .messages({
                'array.max': 'Maximum 2000 contacts allowed per request',
                'array.min': 'At least 1 contact required',
                'array.base': 'contacts must be an array'
            })
    }).unknown(true).required()  // unknown(true) to pass extra body fields through
});

const startCampaignSchema = Joi.object({
    body: Joi.object({
        user_id: Joi.number().integer().optional().messages({
            'number.base': 'user_id must be a number',
            'number.integer': 'user_id must be an integer'
        }),
        messageTemplate: Joi.string().min(1).max(4096).optional().messages({
            'string.base': 'messageTemplate must be a string',
            'string.empty': 'messageTemplate cannot be empty',
            'string.min': 'messageTemplate must contain at least 1 character',
            'string.max': 'Message too long (max 4096 characters)'
        }),
        templateId: Joi.number().integer().optional().messages({
            'number.base': 'templateId must be a number',
            'number.integer': 'templateId must be an integer'
        }),
        sessionName: Joi.string().optional().messages({
            'string.base': 'sessionName must be a string'
        })
    })
        .unknown(false)
        .required()
        .custom((value, helpers) => {
            // Validate that either messageTemplate or templateId is provided
            if (!value.messageTemplate && !value.templateId) {
                return helpers.error('any.required');
            }
            return value;
        }, 'either messageTemplate or templateId'),
    params: Joi.object({
        campaignId: Joi.number().integer().required().messages({
            'number.base': 'campaignId must be a number',
            'number.integer': 'campaignId must be an integer',
            'any.required': 'campaignId is required'
        })
    }).unknown(false).required()
});

const connectWhatsAppSchema = Joi.object({
    body: Joi.object({
        sessionName: Joi.string()
            .pattern(/^session\d+$/)
            .required()
            .messages({
                'string.base': 'Session name must be a string',
                'string.empty': 'Session name cannot be empty',
                'string.pattern.base':
                    'Session name must be like session1, session2, session10',
                'any.required': 'Session name is required'
            })
    })
        .unknown(false)
        .required()
});

const logoutWhatsAppSchema = Joi.object({
    body: Joi.object({
        sessionName: Joi.string()
            .alphanum()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.alphanum': 'Session name must contain only alphanumeric characters',
                'string.min': 'Session name must be at least 3 characters',
                'string.max': 'Session name cannot exceed 50 characters',
                'any.required': 'sessionName is required'
            })
    }).unknown(false).required()
});

// Template Validation Schemas
const saveTemplateSchema = Joi.object({
    body: Joi.object({
        user_id: Joi.number().integer().required().messages({
            'number.base': 'user_id must be a number',
            'any.required': 'user_id is required'
        }),
        template_name: Joi.string().min(1).max(255).required().messages({
            'string.base': 'template_name must be a string',
            'string.empty': 'template_name cannot be empty',
            'string.max': 'template_name must not exceed 255 characters',
            'any.required': 'template_name is required'
        }),
        template_type: Joi.string()
            .valid('plainText', 'buttonMessage', 'linkMenu', 'actionMenu', 'infoCard', 'productCard', 'orderUpdate', 'custom', 'simpleMenu', 'boxMenu')
            .required()
            .messages({
                'string.base': 'template_type must be a string',
                'any.only': 'template_type must be one of: plainText, buttonMessage, linkMenu, actionMenu, infoCard, productCard, orderUpdate, custom, simpleMenu, boxMenu',
                'any.required': 'template_type is required'
            }),
        template_content: Joi.string().min(1).max(4096).required().messages({
            'string.base': 'template_content must be a string',
            'string.empty': 'template_content cannot be empty',
            'string.max': 'template_content must not exceed 4096 characters',
            'any.required': 'template_content is required'
        }),
        variables: Joi.array().items(Joi.string()).optional().messages({
            'array.base': 'variables must be an array'
        }),
        preview_text: Joi.string().max(500).optional().messages({
            'string.max': 'preview_text must not exceed 500 characters'
        }),
        template_data: Joi.object().optional().messages({
            'object.base': 'template_data must be an object'
        })
    }).unknown(false).required()
});

const updateTemplateSchema = Joi.object({
    body: Joi.object({
        user_id: Joi.number().integer().required().messages({
            'number.base': 'user_id must be a number',
            'any.required': 'user_id is required'
        }),
        template_name: Joi.string().min(1).max(255).required().messages({
            'string.base': 'template_name must be a string',
            'string.empty': 'template_name cannot be empty',
            'string.max': 'template_name must not exceed 255 characters',
            'any.required': 'template_name is required'
        }),
        template_type: Joi.string()
            .valid('plainText', 'buttonMessage', 'linkMenu', 'actionMenu', 'infoCard', 'productCard', 'orderUpdate', 'custom', 'simpleMenu', 'boxMenu')
            .required()
            .messages({
                'string.base': 'template_type must be a string',
                'any.only': 'template_type must be one of: plainText, buttonMessage, linkMenu, actionMenu, infoCard, productCard, orderUpdate, custom, simpleMenu, boxMenu',
                'any.required': 'template_type is required'
            }),
        template_content: Joi.string().min(1).max(4096).required().messages({
            'string.base': 'template_content must be a string',
            'string.empty': 'template_content cannot be empty',
            'string.max': 'template_content must not exceed 4096 characters',
            'any.required': 'template_content is required'
        }),
        variables: Joi.array().items(Joi.string()).optional().messages({
            'array.base': 'variables must be an array'
        }),
        preview_text: Joi.string().max(500).optional().messages({
            'string.max': 'preview_text must not exceed 500 characters'
        }),
        template_data: Joi.object().optional().messages({
            'object.base': 'template_data must be an object'
        }),
        is_active: Joi.boolean().optional().messages({
            'boolean.base': 'is_active must be a boolean'
        })
    }).unknown(false).required(),
    params: Joi.object({
        template_id: Joi.number().integer().required().messages({
            'number.base': 'template_id must be a number',
            'any.required': 'template_id is required'
        })
    }).unknown(false).required()
});

const deleteTemplateSchema = Joi.object({
    body: Joi.object({
        user_id: Joi.number().integer().required().messages({
            'number.base': 'user_id must be a number',
            'any.required': 'user_id is required'
        })
    }).unknown(false).required(),
    params: Joi.object({
        template_id: Joi.number().integer().required().messages({
            'number.base': 'template_id must be a number',
            'any.required': 'template_id is required'
        })
    }).unknown(false).required()
});

const deleteCampaignContactSchema = Joi.object({
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
            .optional()
            .messages({
                'array.max': 'Maximum 1000 contacts allowed per request',
                'string.pattern.base': 'Each contact must be a valid phone number (10-15 digits)'
            })
    }).unknown(false).required()
});

const createUserSchema = Joi.object({
    body: Joi.object({
        username: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required()
    }).unknown(false).required()
});


const createCampaignSchema = Joi.object({
    body: Joi.object({
        user_id: Joi.number().integer().required(),
        campaign_name: Joi.string().min(3).max(255).required(),
        campaign_description: Joi.string().max(1000).optional()
    }).unknown(false).required()
});

module.exports = {
    validateRequest,
    addCampaignContactSchema,
    startCampaignSchema,
    connectWhatsAppSchema,
    logoutWhatsAppSchema,
    saveTemplateSchema,
    updateTemplateSchema,
    deleteTemplateSchema,
    deleteCampaignContactSchema,
    createUserSchema,
    createCampaignSchema
};
