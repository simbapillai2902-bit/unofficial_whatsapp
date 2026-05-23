/**
 * FIXED Campaign Controller - Solves FK Constraint Issues
 * 
 * Problem: When adding contacts, FK constraints fail if user/campaign don't exist
 * Solution: Explicit creation order with validation
 * 
 * Usage Order:
 * 1. POST /api/campaign/user/create - Create user
 * 2. POST /api/campaign/campaign/create - Create campaign
 * 3. POST /api/campaign/add-contacts - Add contacts
 */

const dbConnection = require("../config/dbConnection.js");
const { processCampaign, getCampaignStatus } = require("../service/campaign/campaignProcessor");
const { createLogger } = require("../logger");
const { asyncHandler, AppError } = require("../errorMiddleware");

const logger = createLogger('campaign-controller');

/**
 * CREATE USER - STEP 1 of the workflow
 * Ensures user exists before creating campaign
 */
const createUser = asyncHandler(async (req, res) => {
    const { user_id, username, email } = req.body;

    if (!user_id) {
        throw new AppError('user_id is required', 400, 'VALIDATION_001');
    }

    try {
        logger.info({ userId: user_id }, 'Creating user - checking if exists');

        // Check if user already exists
        const [existing] = await dbConnection.query(
            `SELECT id FROM users WHERE id = ?`,
            [user_id]
        );

        if (existing.length > 0) {
            logger.info({ userId: user_id }, 'User already exists');
            return res.status(200).json({
                success: true,
                message: 'User already exists',
                data: {
                    user_id: user_id,
                    status: 'already_exists'
                }
            });
        }

        // Create new user
        const finalUsername = username || `user_${user_id}`;
        const finalEmail = email || `user_${user_id}@notifynow.in`;

        await dbConnection.query(
            `INSERT INTO users (id, username, email, password_hash, created_at) 
             VALUES (?, ?, ?, 'dummy_hash', NOW())`,
            [user_id, finalUsername, finalEmail]
        );

        logger.info({ userId: user_id, username: finalUsername }, 'User created successfully');

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user_id: user_id,
                username: finalUsername,
                email: finalEmail,
                status: 'created'
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, userId: user_id },
            'Failed to create user'
        );

        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError('User ID already exists', 409, 'USER_EXISTS');
        }

        throw error;
    }
});

/**
 * CREATE CAMPAIGN - STEP 2 of the workflow
 * Requires user to exist first (created via createUser API)
 */
const createCampaign = asyncHandler(async (req, res) => {
    const { campaign_id, user_id, campaign_name } = req.body;

    if (!campaign_id || !user_id) {
        throw new AppError(
            'Required fields: campaign_id, user_id',
            400,
            'VALIDATION_002'
        );
    }

    try {
        logger.info(
            { campaignId: campaign_id, userId: user_id },
            'Creating campaign - checking if user exists'
        );

        // CRITICAL: Verify user exists first
        const [user] = await dbConnection.query(
            `SELECT id, username FROM users WHERE id = ?`,
            [user_id]
        );

        if (user.length === 0) {
            throw new AppError(
                `User ${user_id} does not exist. Create user first using POST /api/campaign/user/create`,
                400,
                'USER_NOT_FOUND'
            );
        }

        // Check if campaign already exists
        const [existing] = await dbConnection.query(
            `SELECT id FROM campaigns WHERE id = ?`,
            [campaign_id]
        );

        if (existing.length > 0) {
            logger.info({ campaignId: campaign_id }, 'Campaign already exists');
            return res.status(200).json({
                success: true,
                message: 'Campaign already exists',
                data: {
                    campaign_id: campaign_id,
                    status: 'already_exists'
                }
            });
        }

        // Create campaign
        const finalCampaignName = campaign_name || `API Campaign ${campaign_id}`;

        await dbConnection.query(
            `INSERT INTO campaigns 
             (id, user_id, campaign_name, campaign_status, total_contacts, created_at) 
             VALUES (?, ?, ?, 'draft', 0, NOW())`,
            [campaign_id, user_id, finalCampaignName]
        );

        logger.info(
            { campaignId: campaign_id, userId: user_id, campaignName: finalCampaignName },
            'Campaign created successfully'
        );

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: {
                campaign_id: campaign_id,
                user_id: user_id,
                campaign_name: finalCampaignName,
                status: 'draft',
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId: campaign_id, userId: user_id },
            'Failed to create campaign'
        );

        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError('Campaign ID already exists', 409, 'CAMPAIGN_EXISTS');
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new AppError(
                `User ID ${user_id} doesn't exist in database. Create user first.`,
                400,
                'USER_FK_ERROR'
            );
        }

        throw error;
    }
});

/**
 * ADD CAMPAIGN CONTACTS - STEP 3 of the workflow
 * IMPROVED VERSION: Better error handling, transactions, validation
 */
const addCampaignContact = asyncHandler(async (req, res) => {
    const { campaign_id, user_id, contacts } = req.body;

    // Validate input
    if (!campaign_id || !user_id) {
        throw new AppError(
            'Required: campaign_id, user_id',
            400,
            'VALIDATION_003'
        );
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        throw new AppError(
            'contacts must be a non-empty array',
            400,
            'VALIDATION_004'
        );
    }

    try {
        logger.info(
            { campaignId: campaign_id, userId: user_id, contactCount: contacts.length },
            'Adding contacts - Validating user and campaign'
        );

        // Get connection for transaction
        const connection = await dbConnection.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // VALIDATION 1: Check user exists
            const [userExists] = await connection.query(
                `SELECT id FROM users WHERE id = ?`,
                [user_id]
            );

            if (userExists.length === 0) {
                throw new AppError(
                    `User ${user_id} does not exist. Create user first with POST /api/campaign/user/create`,
                    400,
                    'USER_NOT_FOUND'
                );
            }

            // VALIDATION 2: Check campaign exists
            const [campaignExists] = await connection.query(
                `SELECT id FROM campaigns WHERE id = ?`,
                [campaign_id]
            );

            if (campaignExists.length === 0) {
                throw new AppError(
                    `Campaign ${campaign_id} does not exist. Create campaign first with POST /api/campaign/campaign/create`,
                    400,
                    'CAMPAIGN_NOT_FOUND'
                );
            }

            logger.info(
                { campaignId: campaign_id, userId: user_id },
                'User and campaign validated, adding contacts'
            );

            // Add contacts in batches
            const batchSize = 100;
            let insertedCount = 0;
            let duplicateCount = 0;

            for (let i = 0; i < contacts.length; i += batchSize) {
                const batch = contacts.slice(i, i + batchSize);
                const values = batch.map(phoneNumber => [
                    campaign_id,
                    user_id,
                    phoneNumber.trim(),
                    'pending'
                ]);

                try {
                    const result = await connection.query(
                        `INSERT INTO campaign_queue 
                         (campaign_id, user_id, phone_number, queue_status, created_at) 
                         VALUES ${batch.map(() => '(?, ?, ?, ?, NOW())').join(',')}`,
                        values.flat()
                    );
                    insertedCount += result.affectedRows;
                } catch (batchError) {
                    if (batchError.code === 'ER_DUP_ENTRY') {
                        // Some duplicates, but continue with others
                        logger.warn(
                            { batchIndex: Math.floor(i / batchSize), error: batchError.message },
                            'Some duplicate contacts encountered'
                        );
                        duplicateCount += batch.length - (result?.affectedRows || 0);
                    } else {
                        throw batchError;
                    }
                }
            }

            // Commit transaction
            await connection.commit();

            logger.info(
                {
                    campaignId: campaign_id,
                    userId: user_id,
                    insertedCount,
                    duplicateCount,
                    totalAttempted: contacts.length
                },
                'Contacts added successfully'
            );

            res.status(200).json({
                success: true,
                message: `${insertedCount} contacts added to campaign ${campaign_id}`,
                data: {
                    campaign_id: campaign_id,
                    user_id: user_id,
                    inserted_count: insertedCount,
                    duplicate_count: duplicateCount,
                    total_attempted: contacts.length,
                    status: 'completed'
                }
            });

        } catch (txError) {
            await connection.rollback();
            throw txError;
        } finally {
            connection.release();
        }

    } catch (error) {
        logger.error(
            {
                error: error.message,
                code: error.code,
                campaignId: campaign_id,
                userId: user_id
            },
            'Failed to add campaign contacts'
        );

        // Handle specific FK errors with helpful messages
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new AppError(
                'Foreign key constraint failed. Ensure user and campaign exist first.',
                400,
                'FK_CONSTRAINT_ERROR'
            );
        }

        throw error;
    }
});

/**
 * DELETE CONTACTS - Remove contacts from campaign
 */
const deleteCampaignContacts = asyncHandler(async (req, res) => {
    const { campaign_id, contacts } = req.body;

    if (!campaign_id || !contacts || contacts.length === 0) {
        throw new AppError(
            'Required: campaign_id and contacts array',
            400,
            'VALIDATION_005'
        );
    }

    try {
        const placeholders = contacts.map(() => '?').join(',');
        const result = await dbConnection.query(
            `DELETE FROM campaign_queue 
             WHERE campaign_id = ? AND phone_number IN (${placeholders})`,
            [campaign_id, ...contacts]
        );

        logger.info(
            { campaignId: campaign_id, deletedCount: result.affectedRows },
            'Contacts deleted'
        );

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} contacts deleted`,
            data: {
                campaign_id,
                deleted_count: result.affectedRows
            }
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Failed to delete contacts');
        throw error;
    }
});

/**
 * START CAMPAIGN - Send messages from campaign queue
 */
const startCampaign = asyncHandler(async (req, res) => {
    const { messageTemplate, templateId } = req.body;
    const { campaignId } = req.params;

    try {
        let finalMessage = messageTemplate;

        // Fetch template if templateId provided
        if (templateId) {
            const [templates] = await dbConnection.query(
                `SELECT template_content FROM message_templates WHERE id = ? AND is_active = 1`,
                [templateId]
            );

            if (templates.length === 0) {
                throw new AppError('Template not found or inactive', 404, 'TEMPLATE_001');
            }

            finalMessage = templates[0].template_content;
        }

        if (!finalMessage) {
            throw new AppError(
                'Either messageTemplate or valid templateId must be provided',
                400,
                'CAMPAIGN_003'
            );
        }

        // Check if campaign has pending contacts
        const [campaign] = await dbConnection.query(
            `SELECT COUNT(*) as count FROM campaign_queue 
             WHERE campaign_id = ? AND queue_status = 'pending'`,
            [campaignId]
        );

        if (campaign[0].count === 0) {
            throw new AppError(
                'No pending contacts for this campaign. Add contacts first.',
                404,
                'CAMPAIGN_002'
            );
        }

        logger.info(
            { campaignId, contactCount: campaign[0].count, templateId },
            'Starting campaign processing'
        );

        // Start campaign processing
        await processCampaign(campaignId, finalMessage, templateId);

        res.status(202).json({
            success: true,
            message: 'Campaign processing started',
            data: {
                campaign_id: campaignId,
                contact_count: campaign[0].count,
                status: 'processing',
                status_url: `/api/campaign/${campaignId}/status`
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Failed to start campaign'
        );
        throw error;
    }
});

/**
 * GET CAMPAIGN STATUS
 */
const getCampaignProgressStatus = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    try {
        const status = await getCampaignStatus(campaignId);

        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error({ error: error.message, campaignId }, 'Failed to get campaign status');
        throw error;
    }
});

module.exports = {
    createUser,              // NEW: Step 1
    createCampaign,          // NEW: Step 2
    addCampaignContact,      // IMPROVED: Step 3
    deleteCampaignContacts,
    startCampaign,
    getCampaignProgressStatus
};
