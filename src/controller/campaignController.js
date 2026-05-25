const dbConnection = require("../config/dbConnection.js");
const { processCampaign, getCampaignStatus } = require("../service/campaign/campaignProcessor");
const { createLogger } = require("../logger");
const { asyncHandler, AppError } = require("../errorMiddleware");

const logger = createLogger('campaign-controller');
// start
const createCampaign = asyncHandler(async (req, res) => {
    const { user_id, campaign_name, campaign_description } = req.validatedData.body;

    logger.info({ user_id, campaign_name }, 'Creating campaign');

    const [userExists] = await dbConnection.query(
        `SELECT id FROM users WHERE id = ?`,
        [user_id]
    );

    if (userExists.length === 0) {
        throw new AppError(
            `User ${user_id} not found. Create user first.`,
            400,
            'USER_NOT_FOUND'
        );
    }

    const [result] = await dbConnection.query(
        `INSERT INTO campaigns 
         (user_id, campaign_name, campaign_description, campaign_status, created_at, updated_at) 
         VALUES (?, ?, ?, 'draft', NOW(), NOW())`,
        [user_id, campaign_name, campaign_description || null]
    );

    const campaignId = result.insertId;

    logger.info({ campaignId, user_id }, 'Campaign created successfully');

    res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: {
            id: campaignId,
            user_id,
            campaign_name,
            campaign_status: 'draft',
            created_at: new Date().toISOString()
        }
    });
});

const getAllCampaigns = asyncHandler(async (req, res) => {
    const [campaigns] = await dbConnection.query(
        `SELECT id, user_id, campaign_name, campaign_status, total_contacts, 
                sent_count, delivered_count, read_count, failed_count, 
                created_at FROM campaigns ORDER BY created_at DESC LIMIT 100`
    );

    res.status(200).json({
        success: true,
        count: campaigns.length,
        data: campaigns
    });
});

const getCampaignById = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    const [campaigns] = await dbConnection.query(
        `SELECT * FROM campaigns WHERE id = ?`,
        [campaignId]
    );

    if (campaigns.length === 0) {
        throw new AppError(`Campaign ${campaignId} not found`, 404, 'CAMPAIGN_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        data: campaigns[0]
    });
});

const deleteCampaign = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    const [result] = await dbConnection.query(
        `DELETE FROM campaigns WHERE id = ?`,
        [campaignId]
    );

    if (result.affectedRows === 0) {
        throw new AppError(`Campaign ${campaignId} not found`, 404, 'CAMPAIGN_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        message: `Campaign ${campaignId} deleted successfully`
    });
});

// end

const addCampaignContact = asyncHandler(async (req, res) => {

    const { campaign_id, user_id, contacts } = req.validatedData.body;

    let connection;

    try {

        // =====================================================
        // LOGGER START
        // =====================================================

        logger.info(
            {
                campaignId: campaign_id,
                userId: user_id,
                contactCount: contacts.length
            },
            'Adding contacts to campaign'
        );

        // =====================================================
        // GET CONNECTION + START TRANSACTION
        // =====================================================

        connection = await dbConnection.getConnection();

        await connection.beginTransaction();

        // =====================================================
        // VALIDATE USER EXISTS
        // =====================================================

        const [userExists] = await connection.query(
            `
            SELECT id 
            FROM users 
            WHERE id = ?
            `,
            [user_id]
        );

        if (userExists.length === 0) {

            throw new AppError(
                `User ${user_id} not found`,
                404,
                'USER_NOT_FOUND'
            );
        }

        // =====================================================
        // VALIDATE CAMPAIGN EXISTS
        // =====================================================

        const [campaignExists] = await connection.query(
            `
            SELECT id, user_id
            FROM campaigns
            WHERE id = ?
            `,
            [campaign_id]
        );

        if (campaignExists.length === 0) {

            throw new AppError(
                `Campaign ${campaign_id} not found`,
                404,
                'CAMPAIGN_NOT_FOUND'
            );
        }

        // =====================================================
        // CHECK CAMPAIGN OWNERSHIP
        // =====================================================

        if (campaignExists[0].user_id !== user_id) {

            throw new AppError(
                `Campaign ${campaign_id} does not belong to user ${user_id}`,
                403,
                'CAMPAIGN_OWNERSHIP_ERROR'
            );
        }

        // =====================================================
        // BATCH SETTINGS
        // =====================================================

        const batchSize = 500;

        let totalContactsInserted = 0;
        let totalContactsDuplicate = 0;

        let totalQueueInserted = 0;
        let totalQueueDuplicate = 0;

        // =====================================================
        // PROCESS CONTACTS IN BATCH
        // =====================================================

        for (let i = 0; i < contacts.length; i += batchSize) {

            const batch = contacts.slice(i, i + batchSize);

            // =================================================
            // CONTACTS TABLE INSERT
            // =================================================
            // contacts table DOES NOT contain campaign_id
            // only user_id + phone_number
            // =================================================

            const contactValues = batch.flatMap(contact => {
                const phone = typeof contact === 'string' ? contact : contact.phone;
                return [
                    user_id,
                    phone
                ];
            });

            const contactPlaceholders = batch
                .map(() => '(?, ?)')
                .join(',');

            const [contactResult] = await connection.query(
                `
                INSERT IGNORE INTO contacts
                (
                    user_id,
                    phone_number
                )
                VALUES ${contactPlaceholders}
                `,
                contactValues
            );

            totalContactsInserted += contactResult.affectedRows;

            totalContactsDuplicate += (
                batch.length - contactResult.affectedRows
            );

            // =================================================
            // CAMPAIGN QUEUE INSERT
            // =================================================

            const queueValues = batch.flatMap(contact => {
                const phone = typeof contact === 'string' ? contact : contact.phone;
                const variables = typeof contact === 'string' ? {} : (contact.variables || {});
                return [
                    campaign_id,
                    user_id,
                    phone,
                    'pending',
                    null,
                    JSON.stringify(variables)
                ];
            });

            const queuePlaceholders = batch
                .map(() => '(?, ?, ?, ?, ?, ?)')
                .join(',');

            const [queueResult] = await connection.query(
                `
                INSERT IGNORE INTO campaign_queue
                (
                    campaign_id,
                    user_id,
                    phone_number,
                    queue_status,
                    message_id,
                    variables
                )
                VALUES ${queuePlaceholders}
                `,
                queueValues
            );

            totalQueueInserted += queueResult.affectedRows;

            totalQueueDuplicate += (
                batch.length - queueResult.affectedRows
            );

            // =================================================
            // LOGGER
            // =================================================

            logger.info(
                {
                    campaignId: campaign_id,
                    batchNumber: Math.floor(i / batchSize) + 1,
                    batchSize: batch.length,
                    contactsInserted: contactResult.affectedRows,
                    queueInserted: queueResult.affectedRows
                },
                'Batch processed successfully'
            );
        }

        // =====================================================
        // UPDATE CAMPAIGN TOTAL CONTACTS
        // =====================================================

        await connection.query(
            `
            UPDATE campaigns
            SET total_contacts = (
                SELECT COUNT(*)
                FROM campaign_queue
                WHERE campaign_id = ?
            )
            WHERE id = ?
            `,
            [campaign_id, campaign_id]
        );

        // =====================================================
        // COMMIT TRANSACTION
        // =====================================================

        await connection.commit();

        // =====================================================
        // FINAL LOGGER
        // =====================================================

        logger.info(
            {
                campaignId: campaign_id,
                userId: user_id,
                totalRequested: contacts.length,
                contactsInserted: totalContactsInserted,
                contactsDuplicate: totalContactsDuplicate,
                queueInserted: totalQueueInserted,
                queueDuplicate: totalQueueDuplicate
            },
            'Contacts added successfully'
        );

        // =====================================================
        // SUCCESS RESPONSE
        // =====================================================

        return res.status(201).json({

            success: true,

            message: 'Contacts added successfully',

            data: {

                campaign_id,
                user_id,

                total_requested: contacts.length,

                contacts: {
                    inserted: totalContactsInserted,
                    duplicates_skipped: totalContactsDuplicate
                },

                queue: {
                    inserted: totalQueueInserted,
                    duplicates_skipped: totalQueueDuplicate
                },

                queue_status: 'pending',

                next_step: `/api/campaign/start/${campaign_id}`
            }
        });

    } catch (error) {

        // =====================================================
        // ROLLBACK
        // =====================================================

        if (connection) {
            await connection.rollback();
        }

        // =====================================================
        // LOGGER ERROR
        // =====================================================

        logger.error(
            {
                error: error.message,
                errorCode: error.code,
                campaignId: campaign_id,
                userId: user_id
            },
            'Failed to add campaign contacts'
        );

        // =====================================================
        // MYSQL ERRORS
        // =====================================================

        if (error.code === 'ER_DUP_ENTRY') {

            throw new AppError(
                'Duplicate contact found',
                409,
                'DUPLICATE_CONTACT'
            );
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {

            throw new AppError(
                'Foreign key constraint failed',
                400,
                'FK_CONSTRAINT_ERROR'
            );
        }

        if (error.code === 'ER_BAD_FIELD_ERROR') {

            throw new AppError(
                'Database column missing',
                500,
                'DATABASE_SCHEMA_ERROR'
            );
        }

        throw error;

    } finally {

        // =====================================================
        // RELEASE CONNECTION
        // =====================================================

        if (connection) {
            connection.release();
        }
    }
});

const startCampaign = asyncHandler(async (req, res) => {
    const { messageTemplate, templateId } = req.validatedData.body;
    const { campaignId } = req.validatedData.params;

    try {
        let finalMessage = messageTemplate;

        // If templateId provided, fetch template from database
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
            throw new AppError('Either messageTemplate or valid templateId must be provided', 400, 'CAMPAIGN_003');
        }

        logger.info(
            { campaignId, userId: req.user?.id, templateId, hasTemplate: !!templateId },
            'Starting campaign'
        );

        // Check if campaign exists and get count (check both pending and in_progress statuses)
        const [campaign] = await dbConnection.query(
            `SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND queue_status IN ('pending', 'in_progress')`,
            [campaignId]
        );

        if (campaign[0].count === 0) {
            throw new AppError('No contacts for this campaign. Add contacts first using POST /api/campaign/add-contacts', 404, 'CAMPAIGN_002');
        }

        // Update campaign status to in_progress
        await dbConnection.query(
            `UPDATE campaigns SET campaign_status = 'in_progress' WHERE id = ?`,
            [campaignId]
        );

        // Start campaign processing in background (don't wait for it)
        // This prevents timeout issues - user can check status with GET endpoint
        processCampaign(campaignId, finalMessage, templateId).catch(error => {
            logger.error(
                { campaignId, error: error.message },
                'Background campaign processing failed'
            );
        });

        logger.info(
            { campaignId, contactCount: campaign[0].count, templateId },
            'Campaign processing started in background'
        );

        res.status(202).json({
            success: true,
            message: templateId ? 'Campaign started with template' : 'Campaign started with message',
            data: {
                campaign_id: campaignId,
                template_id: templateId || null,
                total_contacts: campaign[0].count,
                status: 'running',
                message: 'Campaign is processing in background. Check status with GET /api/campaign/{campaignId}/status',
                status_check_url: `/api/campaign/${campaignId}/status`
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId, userId: req.user?.id, templateId },
            'Failed to start campaign'
        );
        throw error;
    }
});

const getCampaignProgressStatus = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    try {
        const status = await getCampaignStatus(campaignId);

        logger.debug({ campaignId }, 'Campaign status retrieved');

        res.status(200).json({
            success: true,
            data: status,
            completionPercentage: status.sent / (status.pending + status.sent + status.failed) * 100 || 0
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Failed to get campaign status'
        );
        throw error;
    }
});

const deleteCampaignContacts = asyncHandler(async (req, res) => {
    const { campaign_id, user_id, contacts } = req.validatedData.body;

    try {
        logger.info(
            { campaignId: campaign_id, userId: user_id, specificContactsCount: contacts ? contacts.length : 'all' },
            'Deleting contacts from campaign'
        );

        let query;
        let queryParams;

        if (contacts && contacts.length > 0) {
            const placeholders = contacts.map(() => '?').join(',');
            query = `DELETE FROM campaign_queue WHERE campaign_id = ? AND user_id = ? AND phone_number IN (${placeholders})`;
            queryParams = [campaign_id, user_id, ...contacts];
        } else {
            query = `DELETE FROM campaign_queue WHERE campaign_id = ? AND user_id = ?`;
            queryParams = [campaign_id, user_id];
        }

        const [result] = await dbConnection.query(query, queryParams);

        logger.info(
            { campaignId: campaign_id, userId: user_id, affectedRows: result.affectedRows },
            'Contacts deleted successfully'
        );

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} contacts deleted successfully`,
            campaignId: campaign_id,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId: campaign_id, userId: user_id },
            'Failed to delete campaign contacts'
        );
        throw error;
    }
});

// ✅ NEW API: Get Campaign Status with Real-Time Breakdown
const getCampaignDetailedStatus = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    try {
        logger.info({ campaignId }, 'Fetching detailed campaign status');

        // ✅ Step 1: Verify campaign exists
        const [campaigns] = await dbConnection.query(
            `SELECT * FROM campaigns WHERE id = ?`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            throw new AppError(`Campaign ${campaignId} not found`, 404, 'CAMPAIGN_NOT_FOUND');
        }

        const campaign = campaigns[0];

        // ✅ Step 2: Get message breakdown by status
        const [statusBreakdown] = await dbConnection.query(
            `SELECT 
                queue_status,
                COUNT(*) as count
             FROM campaign_queue 
             WHERE campaign_id = ?
             GROUP BY queue_status`,
            [campaignId]
        );

        // ✅ Step 3: Build status object
        const status = {
            pending: 0,
            in_progress: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            bounced: 0,
            retry: 0
        };

        statusBreakdown.forEach(row => {
            if (status.hasOwnProperty(row.queue_status)) {
                status[row.queue_status] = row.count;
            }
        });

        // ✅ Step 4: Calculate totals and percentages
        const total = Object.values(status).reduce((a, b) => a + b, 0);
        const completed = status.sent + status.delivered + status.read;
        const failed = status.failed + status.bounced;

        const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
        const deliveryRate = completed > 0 ? ((status.delivered + status.read) / completed) * 100 : 0;
        const readRate = completed > 0 ? (status.read / completed) * 100 : 0;
        const failureRate = total > 0 ? (failed / total) * 100 : 0;

        res.status(200).json({
            success: true,
            data: {
                campaign_id: campaignId,
                campaign_name: campaign.campaign_name,
                campaign_status: campaign.campaign_status,
                total_contacts: total,
                message_breakdown: status,
                metrics: {
                    progress_percentage: parseFloat(progressPercentage.toFixed(2)),
                    delivery_rate: parseFloat(deliveryRate.toFixed(2)),
                    read_rate: parseFloat(readRate.toFixed(2)),
                    failure_rate: parseFloat(failureRate.toFixed(2))
                },
                timestamps: {
                    last_updated: new Date().toISOString(),
                    campaign_created: campaign.created_at,
                    campaign_updated: campaign.updated_at
                }
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Failed to get campaign detailed status'
        );
        throw error;
    }
});

// ✅ NEW API: Get Campaign Analytics (Final Report)
const getCampaignAnalytics = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    try {
        logger.info({ campaignId }, 'Fetching campaign analytics');

        // ✅ Step 1: Verify campaign exists
        const [campaigns] = await dbConnection.query(
            `SELECT * FROM campaigns WHERE id = ?`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            throw new AppError(`Campaign ${campaignId} not found`, 404, 'CAMPAIGN_NOT_FOUND');
        }

        const campaign = campaigns[0];

        // ✅ Step 2: Get aggregate statistics
        const [stats] = await dbConnection.query(
            `SELECT 
                COUNT(*) as total_contacts,
                SUM(CASE WHEN queue_status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN queue_status IN ('delivered', 'read') THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN queue_status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN queue_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN queue_status = 'bounced' THEN 1 ELSE 0 END) as bounce_count,
                AVG(CASE 
                    WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(SECOND, sent_at, delivered_at) 
                    ELSE NULL 
                END) as avg_delivery_time_seconds,
                AVG(CASE 
                    WHEN read_at IS NOT NULL AND sent_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(SECOND, sent_at, read_at) 
                    ELSE NULL 
                END) as avg_read_time_seconds
             FROM campaign_queue 
             WHERE campaign_id = ?`,
            [campaignId]
        );

        const analyticsData = stats[0];
        const total = analyticsData.total_contacts || 0;
        const sent = analyticsData.sent_count || 0;
        const delivered = analyticsData.delivered_count || 0;
        const read = analyticsData.read_count || 0;

        // ✅ Step 3: Calculate performance metrics
        const sendSuccessRate = total > 0 ? (sent / total) * 100 : 0;
        const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
        const readRate = sent > 0 ? (read / sent) * 100 : 0;

        res.status(200).json({
            success: true,
            data: {
                campaign_id: campaignId,
                campaign_name: campaign.campaign_name,
                campaign_status: campaign.campaign_status,
                total_contacts: total,
                message_counts: {
                    total_sent: sent,
                    delivered: delivered,
                    read: read,
                    failed: analyticsData.failed_count || 0,
                    bounced: analyticsData.bounce_count || 0
                },
                performance_metrics: {
                    send_success_rate: parseFloat(sendSuccessRate.toFixed(2)),
                    delivery_rate: parseFloat(deliveryRate.toFixed(2)),
                    read_rate: parseFloat(readRate.toFixed(2)),
                    engagement_rate: delivered > 0 ? parseFloat(((read / delivered) * 100).toFixed(2)) : 0
                },
                time_metrics: {
                    avg_delivery_time_seconds: analyticsData.avg_delivery_time_seconds || 0,
                    avg_read_time_seconds: analyticsData.avg_read_time_seconds || 0
                },
                calculated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Failed to get campaign analytics'
        );
        throw error;
    }
});

// ✅ NEW API: Get Read Status Details
const getCampaignReadStatus = asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    try {
        logger.info({ campaignId }, 'Fetching campaign read status details');

        // ✅ Step 1: Verify campaign exists
        const [campaigns] = await dbConnection.query(
            `SELECT id FROM campaigns WHERE id = ?`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            throw new AppError(`Campaign ${campaignId} not found`, 404, 'CAMPAIGN_NOT_FOUND');
        }

        // ✅ Step 2: Get detailed read information
        const [readDetails] = await dbConnection.query(
            `SELECT 
                id,
                phone_number,
                message_id,
                sent_at,
                delivered_at,
                read_at,
                CASE 
                    WHEN read_at IS NOT NULL AND sent_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(SECOND, sent_at, read_at) 
                    ELSE NULL 
                END as time_to_read_seconds,
                queue_status
             FROM campaign_queue 
             WHERE campaign_id = ? 
             ORDER BY read_at DESC`,
            [campaignId]
        );

        // ✅ Step 3: Calculate summary
        const totalRead = readDetails.filter(d => d.read_at !== null).length;
        const totalDelivered = readDetails.filter(d => d.delivered_at !== null).length;
        const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

        const avgTimeToRead = readDetails
            .filter(d => d.time_to_read_seconds !== null)
            .reduce((sum, d) => sum + (d.time_to_read_seconds || 0), 0) /
            (readDetails.filter(d => d.time_to_read_seconds !== null).length || 1);

        res.status(200).json({
            success: true,
            data: {
                campaign_id: campaignId,
                read_details: readDetails,
                summary: {
                    total_read: totalRead,
                    total_delivered: totalDelivered,
                    total_contacts: readDetails.length,
                    read_rate: parseFloat(readRate.toFixed(2)),
                    avg_time_to_read_seconds: Math.round(avgTimeToRead)
                }
            }
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Failed to get campaign read status'
        );
        throw error;
    }
});

// ✅ NEW API: Get Contacts in Campaign
const getCampaignContacts = asyncHandler(async (req, res) => {

    const { campaignId } = req.params;

    try {

        // =====================================================
        // LOGGER
        // =====================================================

        logger.info(
            { campaignId },
            'Fetching contacts for campaign'
        );

        // =====================================================
        // VALIDATE CAMPAIGN EXISTS
        // =====================================================

        const [campaigns] = await dbConnection.query(
            `
            SELECT 
                id,
                campaign_name,
                user_id,
                campaign_status,
                total_contacts
            FROM campaigns
            WHERE id = ?
            `,
            [campaignId]
        );

        if (campaigns.length === 0) {

            throw new AppError(
                `Campaign ${campaignId} not found`,
                404,
                'CAMPAIGN_NOT_FOUND'
            );
        }

        const campaign = campaigns[0];

        // =====================================================
        // FETCH CAMPAIGN CONTACTS
        // =====================================================
        // campaign relation exists in campaign_queue
        // contacts table stores reusable contacts
        // =====================================================

        const [contacts] = await dbConnection.query(
            `
            SELECT
                cq.id AS queue_id,
                cq.campaign_id,
                cq.user_id,
                cq.phone_number,
                cq.queue_status,
                cq.message_id,
                cq.retry_count,
                cq.sent_at,
                cq.delivered_at,
                cq.read_at,
                cq.failed_at,
                cq.created_at,

                c.id AS contact_id,
                c.contact_name,
                c.email,
                c.country_code,
                c.tags

            FROM campaign_queue cq

            LEFT JOIN contacts c
                ON c.user_id = cq.user_id
                AND c.phone_number = cq.phone_number

            WHERE cq.campaign_id = ?

            ORDER BY cq.created_at DESC
            `,
            [campaignId]
        );

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({

            success: true,

            campaign: {
                id: campaign.id,
                campaign_name: campaign.campaign_name,
                campaign_status: campaign.campaign_status,
                total_contacts: campaign.total_contacts
            },

            total: contacts.length,

            data: contacts
        });

    } catch (error) {

        // =====================================================
        // LOGGER ERROR
        // =====================================================

        logger.error(
            {
                error: error.message,
                errorCode: error.code,
                campaignId
            },
            'Failed to get campaign contacts'
        );

        // =====================================================
        // MYSQL ERRORS
        // =====================================================

        if (error.code === 'ER_BAD_FIELD_ERROR') {

            throw new AppError(
                'Database column missing',
                500,
                'DATABASE_SCHEMA_ERROR'
            );
        }

        throw error;
    }
});

module.exports = {
    addCampaignContact,
    startCampaign,
    getCampaignProgressStatus,
    createCampaign,
    getAllCampaigns,
    getCampaignById,
    deleteCampaign,
    deleteCampaignContacts,
    getCampaignDetailedStatus,
    getCampaignAnalytics,
    getCampaignReadStatus,
    getCampaignContacts
};
