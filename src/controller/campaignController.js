const dbConnection = require("../config/dbConnection.js");
const { processCampaign, getCampaignStatus } = require("../service/campaign/campaignProcessor");
const { createLogger } = require("../logger");
const { asyncHandler, AppError } = require("../errorMiddleware");

const logger = createLogger('campaign-controller');

const addCampaignContact = asyncHandler(async (req, res) => {
    const { campaign_id, user_id, contacts } = req.validatedData.body;

    try {
        logger.info(
            { campaignId: campaign_id, userId: user_id, contactCount: contacts.length },
            'Adding contacts to campaign'
        );

        // Ensure user exists to satisfy foreign key constraints
        const username = `user_${user_id}`;
        const email = `user_${user_id}@notifynow.in`;
        await dbConnection.query(
            `INSERT IGNORE INTO users (id, username, email, password_hash) VALUES (?, ?, ?, 'dummy_hash')`,
            [user_id, username, email]
        );

        // Ensure campaign exists to satisfy foreign key constraints
        const campaignName = `API Campaign ${campaign_id}`;
        await dbConnection.query(
            `INSERT IGNORE INTO campaigns (id, user_id, campaign_name) VALUES (?, ?, ?)`,
            [campaign_id, user_id, campaignName]
        );

        // Insert contacts in batch for better performance
        const insertPromises = [];
        const batchSize = 100;

        for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            const values = batch.map(phoneNumber => [campaign_id, user_id, phoneNumber]);

            insertPromises.push(
                dbConnection.query(
                    `INSERT INTO campaign_queue (campaign_id, user_id, phone_number, created_at) 
                     VALUES ${batch.map(() => '(?, ?, ?, NOW())').join(',')}`,
                    values.flat()
                )
            );
        }

        await Promise.all(insertPromises);

        logger.info(
            { campaignId: campaign_id, userId: user_id, insertedCount: contacts.length },
            'Contacts added successfully'
        );

        res.status(200).json({
            success: true,
            message: `${contacts.length} contacts added successfully`,
            campaignId: campaign_id,
            insertedCount: contacts.length
        });
    } catch (error) {
        logger.error(
            { error: error.message, campaignId: campaign_id, userId: user_id },
            'Failed to add campaign contacts'
        );

        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError('Some contacts already exist', 409, 'CAMPAIGN_001');
        }

        throw error;
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

        // Check if campaign exists and get count
        const [campaign] = await dbConnection.query(
            `SELECT COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? AND queue_status = 'pending'`,
            [campaignId]
        );
        console.log("Here is the campaign data:", campaign);

        if (campaign[0].count === 0) {
            throw new AppError('No pending contacts for this campaign', 404, 'CAMPAIGN_002');
        }

        // Start campaign processing
        await processCampaign(campaignId, finalMessage, templateId);

        logger.info(
            { campaignId, contactCount: campaign[0].count, templateId },
            'Campaign processing started'
        );

        res.status(202).json({
            success: true,
            message: templateId ? 'Campaign started with template' : 'Campaign started',
            campaignId,
            templateId: templateId || null,
            contactCount: campaign[0].count,
            statusCheckUrl: `/api/campaign/${campaignId}/status`
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

const getJobStatus = asyncHandler(async (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Job status endpoint not available',
        code: 'JOB_001'
    });
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

module.exports = {
    addCampaignContact,
    startCampaign,
    getCampaignProgressStatus,
    getJobStatus,
    deleteCampaignContacts
};
