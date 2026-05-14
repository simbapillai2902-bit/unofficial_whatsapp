const dbConnection = require("../../config/dbConnection");
const { getAllSessions } = require("../../config/whatsapp/sessionManager");
const rotationService = require("../../config/whatsapp/rotationService");
const sendMessage = require("../../config/whatsapp/sendMessageService");
const PQueue = require('p-queue').default;
const { createLogger } = require("../../logger");

const logger = createLogger('campaign-processor');

// Queue with throttling - respects WhatsApp rate limits
const messageQueue = new PQueue({
    concurrency: parseInt(process.env.CAMPAIGN_QUEUE_CONCURRENCY) || 5,
    interval: 60 * 1000, // 1 minute
    intervalCap: parseInt(process.env.CAMPAIGN_RATE_LIMIT_PER_MINUTE) || 50
});

const processCampaign = async (campaignId, messageTemplate) => {
    const batchSize = parseInt(process.env.CAMPAIGN_BATCH_SIZE) || 1000;
    let processedCount = 0;
    let failedCount = 0;
    let successCount = 0;

    try {
        logger.info(
            { campaignId, messageTemplate: messageTemplate.substring(0, 50) },
            'Starting campaign processing'
        );

        // Update campaign status to in-progress
        await dbConnection.query(
            `UPDATE campaign_queue SET status = 'in_progress' WHERE campaign_id = ? AND status = 'pending' LIMIT ?`,
            [campaignId, batchSize]
        );

        // Fetch pending contacts in batches
        const [pendingContacts] = await dbConnection.query(
            `SELECT * FROM campaign_queue WHERE status = 'in_progress' AND campaign_id = ? LIMIT ?`,
            [campaignId, batchSize]
        );

        if (pendingContacts.length === 0) {
            logger.info({ campaignId }, 'No pending contacts to process');
            return {
                success: true,
                campaignId,
                processedCount: 0,
                successCount: 0,
                failedCount: 0
            };
        }

        const sessions = getAllSessions();
        const activeChannels = Object.keys(sessions).filter((key) => sessions[key]?.connected);

        if (activeChannels.length === 0) {
            logger.error({ campaignId }, 'No active WhatsApp sessions available');
            
            // Reset status back to pending
            await dbConnection.query(
                `UPDATE campaign_queue SET status = 'pending' WHERE campaign_id = ? AND status = 'in_progress'`,
                [campaignId]
            );

            throw new Error('No active WhatsApp sessions');
        }

        // Add each contact to queue
        const queuePromises = pendingContacts.map((contact) => {
            return messageQueue.add(async () => {
                try {
                    const selectedChannel = await rotationService.getNextChannel(activeChannels);

                    const response = await sendMessage(
                        selectedChannel,
                        contact.mobile,
                        messageTemplate
                    );

                    await dbConnection.query(
                        `UPDATE campaign_queue SET status='sent', sent_flag=1, message_id=?, channel=? WHERE id=?`,
                        [response.key.id, selectedChannel, contact.id]
                    );

                    await dbConnection.query(
                        `INSERT INTO message_logs (user_id, campaign_id, message_id, recipient, status, message_content, send_time) 
                         VALUES(?, ?, ?, ?, ?, ?, NOW())`,
                        [contact.user_id, contact.campaign_id, response.key.id, contact.mobile, 'sent', messageTemplate]
                    );

                    successCount++;
                    logger.debug(
                        { contactId: contact.id, campaignId },
                        'Contact processed successfully'
                    );
                } catch (error) {
                    logger.error(
                        { error: error.message, contactId: contact.id, campaignId },
                        'Failed to process contact'
                    );

                    const newRetryCount = (contact.retry_count || 0) + 1;
                    const maxRetries = parseInt(process.env.CAMPAIGN_MAX_RETRIES) || 3;

                    if (newRetryCount < maxRetries) {
                        await dbConnection.query(
                            `UPDATE campaign_queue SET status='pending', retry_count=?, error_message=?, last_error_at=NOW() WHERE id=?`,
                            [newRetryCount, error.message, contact.id]
                        );
                    } else {
                        await dbConnection.query(
                            `UPDATE campaign_queue SET status='failed', retry_count=?, error_message=?, last_error_at=NOW() WHERE id=?`,
                            [newRetryCount, error.message, contact.id]
                        );
                    }

                    failedCount++;
                }

                processedCount++;
            });
        });

        await Promise.all(queuePromises);

        logger.info(
            { campaignId, processedCount, successCount, failedCount },
            'Campaign batch processing completed'
        );

        return {
            success: true,
            campaignId,
            processedCount,
            successCount,
            failedCount,
            queueSize: messageQueue.size,
            pendingSize: messageQueue.pending
        };
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Campaign processing failed'
        );

        throw error;
    }
};

const getCampaignStatus = async (campaignId) => {
    try {
        const [rows] = await dbConnection.query(
            `SELECT 
                status,
                COUNT(*) as count
             FROM campaign_queue
             WHERE campaign_id = ?
             GROUP BY status`,
            [campaignId]
        );

        const status = {
            campaignId,
            pending: 0,
            sent: 0,
            failed: 0,
            in_progress: 0
        };

        rows.forEach(row => {
            status[row.status] = row.count;
        });

        return status;
    } catch (error) {
        logger.error({ error: error.message, campaignId }, 'Failed to get campaign status');
        throw error;
    }
};

const getQueueStatus = () => {
    return {
        queueSize: messageQueue.size,
        pendingSize: messageQueue.pending,
        concurrency: messageQueue.concurrency
    };
};

module.exports = {
    processCampaign,
    getCampaignStatus,
    getQueueStatus,
    messageQueue
};
