const dbConnection = require("../config/dbConnection.js");
const { createLogger } = require("../logger");

const logger = createLogger('message-read-status-service');

/**
 * Get read status of a single message
 */
const getMessageReadStatus = async (messageId) => {
    try {
        logger.info({ messageId }, 'Fetching read status for message');

        const [message] = await dbConnection.query(
            `SELECT 
                id,
                message_id,
                campaign_id,
                recipient_phone,
                recipient_name,
                delivery_status,
                read_time,
                delivery_time,
                send_time,
                created_at
             FROM message_logs 
             WHERE message_id = ?`,
            [messageId]
        );

        if (!message) {
            return null;
        }

        return {
            message_id: message.message_id,
            recipient_phone: message.recipient_phone,
            recipient_name: message.recipient_name,
            delivery_status: message.delivery_status,
            is_read: message.delivery_status === 'read',
            read_at: message.read_time,
            delivered_at: message.delivery_time,
            sent_at: message.send_time
        };
    } catch (error) {
        logger.error(
            { error: error.message, messageId },
            'Error fetching message read status'
        );
        throw error;
    }
};

/**
 * Get read count and statistics for a specific message
 */
const getMessageReadCount = async (messageId) => {
    try {
        logger.info({ messageId }, 'Fetching read count for message');

        const [stats] = await dbConnection.query(
            `SELECT 
                message_id,
                SUM(CASE WHEN delivery_status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                COUNT(*) as total_recipients
             FROM message_logs 
             WHERE message_id = ?
             GROUP BY message_id`,
            [messageId]
        );

        if (!stats) {
            return null;
        }

        const readCount = stats.read_count || 0;
        const totalRecipients = stats.total_recipients || 0;
        const readRate = totalRecipients > 0 ? (readCount / totalRecipients * 100).toFixed(2) : 0;

        return {
            message_id: stats.message_id,
            total_recipients: totalRecipients,
            read_count: readCount,
            delivered_count: stats.delivered_count || 0,
            sent_count: stats.sent_count || 0,
            pending_count: stats.pending_count || 0,
            failed_count: stats.failed_count || 0,
            read_rate_percentage: parseFloat(readRate)
        };
    } catch (error) {
        logger.error(
            { error: error.message, messageId },
            'Error fetching message read count'
        );
        throw error;
    }
};

/**
 * Get list of users who read a specific message
 */
const getMessageReadByUsers = async (messageId) => {
    try {
        logger.info({ messageId }, 'Fetching users who read the message');

        const readUsers = await dbConnection.query(
            `SELECT 
                id,
                message_id,
                recipient_phone,
                recipient_name,
                read_time,
                delivery_time
             FROM message_logs 
             WHERE message_id = ? AND delivery_status = 'read'
             ORDER BY read_time ASC`,
            [messageId]
        );

        return readUsers.map(user => ({
            phone_number: user.recipient_phone,
            contact_name: user.recipient_name || 'Unknown',
            read_at: user.read_time,
            delivered_at: user.delivery_time
        }));
    } catch (error) {
        logger.error(
            { error: error.message, messageId },
            'Error fetching read users'
        );
        throw error;
    }
};

/**
 * Get list of users with pending read status
 */
const getMessagePendingReadUsers = async (messageId) => {
    try {
        logger.info({ messageId }, 'Fetching users with pending read status');

        const pendingUsers = await dbConnection.query(
            `SELECT 
                id,
                message_id,
                recipient_phone,
                recipient_name,
                delivery_status,
                delivery_time
             FROM message_logs 
             WHERE message_id = ? AND delivery_status IN ('delivered', 'sent')
             ORDER BY delivery_time DESC`,
            [messageId]
        );

        return pendingUsers.map(user => ({
            phone_number: user.recipient_phone,
            contact_name: user.recipient_name || 'Unknown',
            delivery_status: user.delivery_status,
            delivered_at: user.delivery_time
        }));
    } catch (error) {
        logger.error(
            { error: error.message, messageId },
            'Error fetching pending read users'
        );
        throw error;
    }
};

/**
 * Get campaign-wide read summary
 */
const getCampaignReadSummary = async (campaignId) => {
    try {
        logger.info({ campaignId }, 'Fetching campaign read summary');

        const [stats] = await dbConnection.query(
            `SELECT 
                campaign_id,
                SUM(CASE WHEN delivery_status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                COUNT(*) as total_messages
             FROM message_logs 
             WHERE campaign_id = ?
             GROUP BY campaign_id`,
            [campaignId]
        );

        if (!stats) {
            return null;
        }

        const readCount = stats.read_count || 0;
        const totalMessages = stats.total_messages || 0;
        const readRate = totalMessages > 0 ? (readCount / totalMessages * 100).toFixed(2) : 0;

        return {
            campaign_id: campaignId,
            total_messages: totalMessages,
            read_count: readCount,
            delivered_count: stats.delivered_count || 0,
            sent_count: stats.sent_count || 0,
            pending_count: stats.pending_count || 0,
            failed_count: stats.failed_count || 0,
            read_rate_percentage: parseFloat(readRate)
        };
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Error fetching campaign read summary'
        );
        throw error;
    }
};

/**
 * Get all messages of a campaign with read status
 */
const getCampaignMessagesReadStatus = async (campaignId, limit = 100, offset = 0) => {
    try {
        logger.info({ campaignId, limit, offset }, 'Fetching campaign messages with read status');

        const messages = await dbConnection.query(
            `SELECT 
                id,
                message_id,
                campaign_id,
                recipient_phone,
                recipient_name,
                delivery_status,
                read_time,
                delivery_time,
                send_time,
                created_at
             FROM message_logs 
             WHERE campaign_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [campaignId, limit, offset]
        );

        return messages.map(msg => ({
            message_id: msg.message_id,
            recipient_phone: msg.recipient_phone,
            recipient_name: msg.recipient_name || 'Unknown',
            delivery_status: msg.delivery_status,
            is_read: msg.delivery_status === 'read',
            read_at: msg.read_time,
            delivered_at: msg.delivery_time,
            sent_at: msg.send_time,
            created_at: msg.created_at
        }));
    } catch (error) {
        logger.error(
            { error: error.message, campaignId },
            'Error fetching campaign messages read status'
        );
        throw error;
    }
};

/**
 * Manually mark a message as read
 */
const markMessageAsRead = async (messageId, phoneNumber) => {
    try {
        logger.info({ messageId, phoneNumber }, 'Marking message as read');

        // Update message_logs
        const result = await dbConnection.query(
            `UPDATE message_logs 
             SET delivery_status = 'read', read_time = NOW(), updated_at = NOW()
             WHERE message_id = ? AND recipient_phone = ?`,
            [messageId, phoneNumber]
        );

        if (result.affectedRows === 0) {
            logger.warn({ messageId, phoneNumber }, 'Message not found to mark as read');
            return false;
        }

        // Get the message_log_id to record in message_delivery_status
        const [message] = await dbConnection.query(
            `SELECT id FROM message_logs WHERE message_id = ? AND recipient_phone = ?`,
            [messageId, phoneNumber]
        );

        if (message) {
            // Record status change in message_delivery_status
            await dbConnection.query(
                `INSERT INTO message_delivery_status (message_log_id, status_change, status_metadata)
                 VALUES (?, 'read', ?)`,
                [message.id, JSON.stringify({ manual_mark: true, marked_at: new Date().toISOString() })]
            );
        }

        logger.info({ messageId, phoneNumber }, 'Message marked as read successfully');
        return true;
    } catch (error) {
        logger.error(
            { error: error.message, messageId, phoneNumber },
            'Error marking message as read'
        );
        throw error;
    }
};

/**
 * Get read status history for a message
 */
const getMessageReadHistory = async (messageId) => {
    try {
        logger.info({ messageId }, 'Fetching message read history');

        const history = await dbConnection.query(
            `SELECT 
                mds.id,
                mds.message_log_id,
                mds.status_change,
                mds.status_timestamp,
                mds.status_metadata,
                ml.recipient_phone,
                ml.recipient_name
             FROM message_delivery_status mds
             JOIN message_logs ml ON mds.message_log_id = ml.id
             WHERE ml.message_id = ? AND mds.status_change = 'read'
             ORDER BY mds.status_timestamp ASC`,
            [messageId]
        );

        return history.map(record => ({
            message_log_id: record.message_log_id,
            recipient_phone: record.recipient_phone,
            recipient_name: record.recipient_name || 'Unknown',
            status_change: record.status_change,
            read_at: record.status_timestamp,
            metadata: record.status_metadata ? JSON.parse(record.status_metadata) : null
        }));
    } catch (error) {
        logger.error(
            { error: error.message, messageId },
            'Error fetching read history'
        );
        throw error;
    }
};

module.exports = {
    getMessageReadStatus,
    getMessageReadCount,
    getMessageReadByUsers,
    getMessagePendingReadUsers,
    getCampaignReadSummary,
    getCampaignMessagesReadStatus,
    markMessageAsRead,
    getMessageReadHistory
};
