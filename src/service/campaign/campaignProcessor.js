const fs = require('fs');
const path = require('path');
const dbConnection = require("../../config/dbConnection");
const { getAllSessions, createSession } = require("../../config/whatsapp/sessionManager");
const rotationService = require("../../config/whatsapp/rotationService");
const sendMessage = require("../../config/whatsapp/sendMessageService");
const PQueue = require('p-queue').default;
const { createLogger } = require("../../logger");

const logger = createLogger('campaign-processor');

const messageQueue = new PQueue({
    concurrency: parseInt(process.env.CAMPAIGN_QUEUE_CONCURRENCY) || 5,
    interval: 60 * 1000, // 1 minute
    intervalCap: parseInt(process.env.CAMPAIGN_RATE_LIMIT_PER_MINUTE) || 50,
    carryoverConcurrencyCount: true
});

// --- Anti-Ban Configuration ---
const antiBan = {
    jitterMin:       parseInt(process.env.ANTI_BAN_JITTER_MIN_MS)         || 3000,
    jitterMax:       parseInt(process.env.ANTI_BAN_JITTER_MAX_MS)         || 8000,
    burstThreshold:  parseInt(process.env.ANTI_BAN_BURST_THRESHOLD)       || 20,
    burstPauseMin:   parseInt(process.env.ANTI_BAN_BURST_PAUSE_MIN_MS)    || 15000,
    burstPauseMax:   parseInt(process.env.ANTI_BAN_BURST_PAUSE_MAX_MS)    || 35000,
    warmupMessages:  parseInt(process.env.ANTI_BAN_WARMUP_MESSAGES)       || 10,
    warmupMultiplier:parseFloat(process.env.ANTI_BAN_WARMUP_MULTIPLIER)   || 2,
};

/**
 * Returns a random integer between min and max (inclusive).
 */
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Returns a jitter delay in ms.
 * If isWarmup is true, the delay is multiplied by antiBan.warmupMultiplier.
 */
const getJitterDelay = (isWarmup = false) => {
    const base = randomBetween(antiBan.jitterMin, antiBan.jitterMax);
    return isWarmup ? Math.round(base * antiBan.warmupMultiplier) : base;
};

// Per-session send counters (reset on process restart — sufficient for anti-ban)
const sessionSendCounters = {};

// --- Anti-Ban Configuration ---
const antiBan = {
    jitterMin:       parseInt(process.env.ANTI_BAN_JITTER_MIN_MS)         || 3000,
    jitterMax:       parseInt(process.env.ANTI_BAN_JITTER_MAX_MS)         || 8000,
    burstThreshold:  parseInt(process.env.ANTI_BAN_BURST_THRESHOLD)       || 20,
    burstPauseMin:   parseInt(process.env.ANTI_BAN_BURST_PAUSE_MIN_MS)    || 15000,
    burstPauseMax:   parseInt(process.env.ANTI_BAN_BURST_PAUSE_MAX_MS)    || 35000,
    warmupMessages:  parseInt(process.env.ANTI_BAN_WARMUP_MESSAGES)       || 10,
    warmupMultiplier:parseFloat(process.env.ANTI_BAN_WARMUP_MULTIPLIER)   || 2,
};

/**
 * Returns a random integer between min and max (inclusive).
 */
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Returns a jitter delay in ms.
 * If isWarmup is true, the delay is multiplied by antiBan.warmupMultiplier.
 */
const getJitterDelay = (isWarmup = false) => {
    const base = randomBetween(antiBan.jitterMin, antiBan.jitterMax);
    return isWarmup ? Math.round(base * antiBan.warmupMultiplier) : base;
};

// Per-session send counters (reset on process restart — sufficient for anti-ban)
const sessionSendCounters = {};

const processCampaign = async (campaignId, messageTemplate, templateId = null, sessionName = null, imageUrl = null) => {
    const batchSize = parseInt(process.env.CAMPAIGN_BATCH_SIZE) || 1000;
    let processedCount = 0;
    let failedCount = 0;
    let successCount = 0;

    try {
        logger.info(
            { campaignId, messageTemplate: messageTemplate?.substring(0, 50), templateId, sessionName, hasImage: !!imageUrl },
            'Starting campaign processing'
        );

        // Fetch pending contacts first
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

        // ✅ FIX: Bulk-mark ALL fetched contacts as 'in_progress' IMMEDIATELY
        // so the DB accurately reflects queued-but-not-yet-sent contacts
        // instead of leaving them as 'pending' while they wait in the in-memory p-queue.
        const fetchedIds = pendingContacts.map(c => c.id);
        const idPlaceholders = fetchedIds.map(() => '?').join(',');
        await dbConnection.query(
            `UPDATE campaign_queue SET queue_status = 'in_progress', updated_at = NOW() WHERE id IN (${idPlaceholders})`,
            fetchedIds
        );
        logger.info(
            { campaignId, count: fetchedIds.length },
            'Bulk-marked fetched contacts as in_progress'
        );

        let sessions = getAllSessions();
        let activeChannels = sessions
            .filter(({ connected }) => connected)
            .map(({ name, id }) => ({
                name,
                id
            }));

        // If a specific session is requested, restrict active channels to it
        if (sessionName) {
            activeChannels = activeChannels.filter(c => c.name === sessionName);
        }

        // Lazy auto-reconnect if our requested channel (or all channels) is not loaded in memory
        if (activeChannels.length === 0) {
            logger.info({ campaignId, sessionName }, 'Requested WhatsApp channel is not active. Checking for saved session to auto-reconnect...');
            try {
                const sessionDirPath = path.join(process.cwd(), 'session');
                const sessionsToWake = sessionName ? [sessionName] : [];

                if (!sessionName && fs.existsSync(sessionDirPath)) {
                    const files = fs.readdirSync(sessionDirPath);
                    const saved = files.filter(file => {
                        const fullPath = path.join(sessionDirPath, file);
                        return fs.statSync(fullPath).isDirectory() && /^session\d+$/.test(file);
                    });
                    sessionsToWake.push(...saved);
                }

                if (sessionsToWake.length > 0) {
                    logger.info({ sessionsToWake }, 'Waking up saved session(s)...');
                    for (const sName of sessionsToWake) {
                        const sPath = path.join(sessionDirPath, sName);
                        if (fs.existsSync(sPath)) {
                            createSession(sName).catch(err => {
                                logger.error({ sessionName: sName, error: err.message }, 'Failed to wake up session');
                            });
                        }
                    }

                    // Wait 3 seconds for reconnection handshake
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Query active sessions again
                    sessions = getAllSessions();
                    activeChannels = sessions
                        .filter(({ connected }) => connected)
                        .map(({ name, id }) => ({
                            name,
                            id
                        }));

                    if (sessionName) {
                        activeChannels = activeChannels.filter(c => c.name === sessionName);
                    }
                }
            } catch (wakeErr) {
                logger.warn({ error: wakeErr.message }, 'Error during session wake-up check');
            }
        }

        if (activeChannels.length === 0) {
            logger.error({ campaignId, sessionName }, 'No active WhatsApp sessions available');
            throw new Error('No active WhatsApp sessions');
        }

        // Add each contact to queue
        const queuePromises = pendingContacts.map((contact) => {
            return messageQueue.add(async () => {
                try {
                    // Status is already 'in_progress' (set in bulk before queue started)
                    const selectedChannel = await rotationService.getNextChannel(activeChannels);
                    if (!selectedChannel) {
                        throw new Error("Selected channel is not available");
                    }

                    logger.debug(
                        { contactId: contact.id, phoneNumber: contact.phone_number },
                        'Sending message to contact'
                    );

                    // ─── ANTI-BAN: Per-send delay with jitter ─────────────────────────────────
                    const sessionKey = selectedChannel.name;
                    sessionSendCounters[sessionKey] = (sessionSendCounters[sessionKey] || 0) + 1;
                    const sendCount = sessionSendCounters[sessionKey];

                    const isWarmup = sendCount <= antiBan.warmupMessages;
                    const isBurst  = sendCount % antiBan.burstThreshold === 0;

                    if (isBurst) {
                        const burstPause = randomBetween(antiBan.burstPauseMin, antiBan.burstPauseMax);
                        logger.info(
                            { campaignId, sessionName: sessionKey, sendCount, burstPause },
                            `Anti-ban burst pause: ${(burstPause / 1000).toFixed(1)}s after ${antiBan.burstThreshold} messages`
                        );
                        await new Promise(resolve => setTimeout(resolve, burstPause));
                    } else {
                        const jitter = getJitterDelay(isWarmup);
                        logger.debug(
                            { campaignId, sessionName: sessionKey, sendCount, jitter, isWarmup },
                            `Anti-ban jitter delay: ${jitter}ms${isWarmup ? ' (warm-up)' : ''}`
                        );
                        await new Promise(resolve => setTimeout(resolve, jitter));
                    }
                    // ─────────────────────────────────────────────────────────────────────────

                    // Interpolate variables if they exist
                    let personalizedMessage = messageTemplate;
                    if (contact.variables) {
                        let variablesObj = {};
                        try {
                            variablesObj = typeof contact.variables === 'string'
                                ? JSON.parse(contact.variables)
                                : contact.variables;
                        } catch (e) {
                            logger.warn({ error: e.message, contactId: contact.id }, 'Failed to parse variables for contact');
                        }

                        if (variablesObj && typeof variablesObj === 'object') {
                            Object.keys(variablesObj).forEach(key => {
                                const value = variablesObj[key];
                                const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
                                personalizedMessage = personalizedMessage.replace(regex, value !== undefined && value !== null ? value : '');
                            });
                        }
                    }

                    const response = await sendMessage(
                        selectedChannel.name,
                        contact.phone_number,
                        personalizedMessage,
                        imageUrl   // null if text-only campaign
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
                        [contact.user_id, contact.campaign_id, templateId || null, response.key.id, contact.phone_number, 'sent',
                         imageUrl ? `[IMAGE] ${personalizedMessage}` : personalizedMessage]
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
                        // Reset to 'pending' so it gets picked up in the next batch
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

                        // Trigger webhook DLR notification for failure
                        try {
                            const [campRows] = await dbConnection.query(
                                `SELECT webhook_url FROM campaigns WHERE id = ? LIMIT 1`,
                                [campaignId]
                            );
                            const webhookUrl = campRows[0]?.webhook_url;
                            if (webhookUrl) {
                                const payload = {
                                    campaign_id: campaignId,
                                    recipient: contact.phone_number,
                                    status: 'failed',
                                    reason: error.message
                                };
                                logger.info(
                                    { campaignId, recipient: contact.phone_number, webhookUrl },
                                    'Sending failure DLR webhook notification'
                                );
                                fetch(webhookUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                }).catch(err => {
                                    logger.error({ error: err.message }, 'Failed to dispatch failure webhook');
                                });
                            }
                        } catch (webhookErr) {
                            logger.error({ error: webhookErr.message }, 'Failed to query webhookUrl on campaign send failure');
                        }
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
