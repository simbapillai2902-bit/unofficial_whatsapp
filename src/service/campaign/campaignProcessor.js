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

        // ✅ FIX: Fetch pending contacts FIRST, without updating status yet
        const [pendingContacts] = await dbConnection.query(
            `SELECT * FROM campaign_queue WHERE queue_status = 'pending' AND campaign_id = ? LIMIT ?`,
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
        const activeChannels = sessions
            .filter(({ connected }) => connected)
            .map(({ name, id }) => ({
                name,
                id
            }));

        if (activeChannels.length === 0) {
            logger.error({ campaignId }, 'No active WhatsApp sessions available');
            throw new Error('No active WhatsApp sessions');
        }

        // Add each contact to queue
        const queuePromises = pendingContacts.map((contact) => {
            return messageQueue.add(async () => {
                try {
                    // ✅ FIX: Update to 'in_progress' JUST before sending
                    await dbConnection.query(
                        `UPDATE campaign_queue SET queue_status = 'in_progress' WHERE id = ?`,
                        [contact.id]
                    );

                    const selectedChannel = await rotationService.getNextChannel(activeChannels);
                    if (!selectedChannel) {
                        throw new Error("Selected channel is not available");
                    }

                    logger.debug(
                        { contactId: contact.id, phoneNumber: contact.phone_number },
                        'Sending message to contact'
                    );

                    const response = await sendMessage(
                        selectedChannel.name,
                        contact.phone_number,
                        messageTemplate
                    );
                    
                    // ✅ FIX: Mark as 'sent' when WhatsApp accepts (message left our server)
                    // Status will change to 'delivered' and 'read' when WhatsApp sends status updates
                    await dbConnection.query(
                        `UPDATE campaign_queue 
                         SET queue_status='sent', message_id=?, whatsapp_session_id=?, sent_at=NOW(), updated_at=NOW() 
                         WHERE id=?`,
                        [response.key.id, selectedChannel.id, contact.id]
                    );

                    await dbConnection.query(
                        `INSERT INTO message_logs (user_id, campaign_id, template_id, message_id, recipient_phone, delivery_status, message_content, send_time) 
                         VALUES(?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [contact.user_id, contact.campaign_id, templateId || null, response.key.id, contact.phone_number, 'sent', messageTemplate]
                    );

                    successCount++;
                    logger.info(
                        { contactId: contact.id, campaignId, messageId: response.key.id },
                        'Message sent successfully'
                    );
                } catch (error) {
                    logger.error(
                        { error: error.message, contactId: contact.id, campaignId },
                        'Failed to process contact'
                    );

                    const newRetryCount = (contact.retry_count || 0) + 1;
                    const maxRetries = parseInt(process.env.CAMPAIGN_MAX_RETRIES) || 3;

                    if (newRetryCount < maxRetries) {
                        // ✅ FIX: Reset to 'pending' for retry
                        await dbConnection.query(
                            `UPDATE campaign_queue 
                             SET queue_status='pending', retry_count=?, error_message=?, updated_at=NOW() 
                             WHERE id=?`,
                            [newRetryCount, error.message, contact.id]
                        );
                    } else {
                        // Mark as failed after max retries
                        await dbConnection.query(
                            `UPDATE campaign_queue 
                             SET queue_status='failed', retry_count=?, error_message=?, failed_at=NOW(), updated_at=NOW() 
                             WHERE id=?`,
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
