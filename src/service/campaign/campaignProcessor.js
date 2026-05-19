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

const processCampaign = async (campaignId, messageTemplate, templateId = null) => {
    const batchSize = parseInt(process.env.CAMPAIGN_BATCH_SIZE) || 1000;
    let processedCount = 0;
    let failedCount = 0;
    let successCount = 0;

    try {
        logger.info(
            { campaignId, messageTemplate: messageTemplate.substring(0, 50), templateId },
            'Starting campaign processing'
        );

        // Update campaign status to in-progress
        await dbConnection.query(
            `UPDATE campaign_queue SET queue_status = 'in_progress' WHERE campaign_id = ? AND queue_status = 'pending' LIMIT ?`,
            [campaignId, batchSize]
        );

        // Fetch pending contacts in batches
        const [pendingContacts] = await dbConnection.query(
            `SELECT * FROM campaign_queue WHERE queue_status = 'in_progress' AND campaign_id = ? LIMIT ?`,
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
        
        const activeChannels = sessions.filter(({connected})=> connected).map(({name})=> name);

        if (activeChannels.length === 0) {
            logger.error({ campaignId }, 'No active WhatsApp sessions available');
            
            // Reset status back to pending
            await dbConnection.query(
                `UPDATE campaign_queue SET queue_status = 'pending' WHERE campaign_id = ? AND queue_status = 'in_progress'`,
                [campaignId]
            );

            throw new Error('No active WhatsApp sessions');
        }

        // Add each contact to queue
        const queuePromises = pendingContacts.map((contact) => {
            return messageQueue.add(async () => {
                try {
                    
                    const selectedChannel = await rotationService.getNextChannel(activeChannels);
                    if(selectedChannel == ( null || 0) ){
                        throw new error ("Selected channel is not present")
                    }

                    const response = await sendMessage(
                        selectedChannel,
                        contact.phone_number,
                        messageTemplate
                    );

                    await dbConnection.query(
                        `UPDATE campaign_queue SET queue_status='sent', message_id=?, whatsapp_session_id=? WHERE id=?`,
                        [response.key.id, selectedChannel, contact.id]
                    );

                    await dbConnection.query(
                        `INSERT INTO message_logs (user_id, campaign_id, template_id, message_id, recipient_phone, delivery_status, message_content, send_time) 
                         VALUES(?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [contact.user_id, contact.campaign_id, templateId || null, response.key.id, contact.phone_number, 'sent', messageTemplate]
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
                            `UPDATE campaign_queue SET queue_status='pending', retry_count=?, error_message=?, updated_at=NOW() WHERE id=?`,
                            [newRetryCount, error.message, contact.id]
                        );
                    } else {
                        await dbConnection.query(
                            `UPDATE campaign_queue SET queue_status='failed', retry_count=?, error_message=?, updated_at=NOW() WHERE id=?`,
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
            { campaignId, processedCount, successCount, failedCount, templateId },
            'Campaign batch processing completed'
        );

        return {
            success: true,
            campaignId,
            processedCount,
            successCount,
            failedCount,
            templateId,
            queueSize: messageQueue.size,
            pendingSize: messageQueue.pending
        };
    } catch (error) {
        logger.error(
            { error: error.message, campaignId, templateId },
            'Campaign processing failed'
        );

        throw error;
    }
};

const getCampaignStatus = async (campaignId) => {
    try {
        const [rows] = await dbConnection.query(
            `SELECT 
                queue_status as status,
                COUNT(*) as count
             FROM campaign_queue
             WHERE campaign_id = ?
             GROUP BY queue_status`,
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
