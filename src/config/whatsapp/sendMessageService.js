const https = require('https');
const http = require('http');
const { getSession } = require("./sessionManager.js");
const { createLogger } = require("../../logger");

const logger = createLogger('send-message-service');

/**
 * Download an image URL and return a Buffer.
 * Baileys { url } shorthand can fail on some servers — buffer is most reliable.
 */
const downloadImageBuffer = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const client = imageUrl.startsWith('https') ? https : http;
        client.get(imageUrl, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Image fetch failed: HTTP ${res.statusCode} for ${imageUrl}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
};

/**
 * Detect mimetype from URL extension.
 * Defaults to image/jpeg if unknown.
 */
const getMimeType = (url) => {
    const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
    const map = {
        png:  'image/png',
        jpg:  'image/jpeg',
        jpeg: 'image/jpeg',
        gif:  'image/gif',
        webp: 'image/webp',
    };
    return map[ext] || 'image/jpeg';
};

/**
 * Send a WhatsApp message (text-only or image+caption).
 *
 * @param {string} sessionName   - Baileys session name (e.g. "session33")
 * @param {string} mobile        - Phone number without + (e.g. "919876543210")
 * @param {string} message       - Text message or caption for the image
 * @param {string|null} imageUrl - (Optional) Public URL of the image to send
 */
const sendMessage = async (sessionName, mobile, message, imageUrl = null) => {
    try {
        if (!mobile) {
            throw new Error('Mobile number is required');
        }

        if (!message && !imageUrl) {
            throw new Error('Either message text or imageUrl is required');
        }

        if (message && message.length > 4096) {
            throw new Error('Message too long (max 4096 characters)');
        }

        const session = getSession(sessionName);

        if (!session) {
            throw new Error(`Session not found: ${sessionName}`);
        }

        if (!session.connected) {
            throw new Error(`Session not connected: ${sessionName}`);
        }

        const jid = `${mobile}@s.whatsapp.net`;
        let response;

        if (imageUrl) {
            // ── Image Message ─────────────────────────────────────────────
            logger.info({ sessionName, mobile, imageUrl }, 'Downloading image for WhatsApp send');

            // Download image as Buffer — most reliable method in Baileys
            const imageBuffer = await downloadImageBuffer(imageUrl);
            const mimetype   = getMimeType(imageUrl);

            logger.info({ sessionName, mobile, imageUrl, mimetype, bufferSize: imageBuffer.length }, 'Image downloaded, sending via Baileys');

            response = await session.sock.sendMessage(jid, {
                image:    imageBuffer,
                caption:  message || '',
                mimetype: mimetype,
            });
        } else {
            // ── Text-only Message ─────────────────────────────────────────
            response = await session.sock.sendMessage(jid, {
                text: message,
            });
        }

        session.messageCount++;

        logger.info(
            { sessionName, mobile, messageId: response.key.id, hasImage: !!imageUrl },
            'Message sent successfully'
        );

        return response;
    } catch (error) {
        logger.error(
            { error: error.message, sessionName, mobile, imageUrl },
            'Failed to send message'
        );
        throw error;
    }
};

module.exports = sendMessage;
