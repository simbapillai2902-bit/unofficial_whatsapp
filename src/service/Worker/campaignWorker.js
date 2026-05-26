const processQueue = require('../campaign/queueProcessor.js');
const dbConnection = require('../../config/dbConnection');
const { createLogger } = require('../../logger');

const logger = createLogger('campaign-worker');

logger.info('Campaign Worker Started');

// Track which campaigns are currently being processed (prevent concurrent processing)
const activeProcessing = new Map();

// Main worker loop - processes campaigns every 5 seconds
setInterval(async () => {
    try {
        // Get all campaigns with pending or in_progress items
        const [activeCampaigns] = await dbConnection.query(`
            SELECT DISTINCT 
                cq.campaign_id,
                c.campaign_template,
                COUNT(*) as pending_count
            FROM campaign_queue cq
            JOIN campaigns c ON cq.campaign_id = c.id
            WHERE cq.queue_status IN ('pending', 'in_progress', 'retry')
            GROUP BY cq.campaign_id, c.campaign_template
            LIMIT 10
        `);

        if (activeCampaigns.length === 0) {
            logger.debug('No campaigns with pending items');
            return;
        }

        for (const campaign of activeCampaigns) {
            const processingKey = `campaign_${campaign.campaign_id}`;
            
            // Skip if already being processed by another worker instance
            if (activeProcessing.has(processingKey)) {
                logger.debug(
                    { campaignId: campaign.campaign_id },
                    'Campaign already being processed, skipping'
                );
                continue;
            }

            // Mark as processing
            activeProcessing.set(processingKey, {
                startTime: Date.now(),
                contactsProcessed: 0
            });

            try {
                logger.info(
                    { campaignId: campaign.campaign_id, pendingCount: campaign.pending_count },
                    'Processing campaign queue'
                );

                await processQueue(campaign.campaign_id, campaign.campaign_template);

                logger.info(
                    { campaignId: campaign.campaign_id },
                    'Campaign queue processed successfully'
                );
            } catch (error) {
                logger.error(
                    { error: error.message, campaignId: campaign.campaign_id, stack: error.stack },
                    'Error processing campaign queue'
                );
            } finally {
                activeProcessing.delete(processingKey);
            }
        }
    } catch (error) {
        logger.error(
            { error: error.message, stack: error.stack },
            'Campaign worker error'
        );
    }
}, 5000);

// Cleanup stuck campaigns every 30 seconds (if processing takes > 5 minutes, consider it stuck)
setInterval(() => {
    const now = Date.now();
    const stuckTimeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, data] of activeProcessing.entries()) {
        if (now - data.startTime > stuckTimeout) {
            logger.warn(
                { key, duration: now - data.startTime },
                'Removing stuck campaign processing lock'
            );
            activeProcessing.delete(key);
        }
    }
}, 30000);