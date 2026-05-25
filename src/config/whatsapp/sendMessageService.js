const { getSession } = require("./sessionManager.js");
const { createLogger } = require("../../logger");

const logger = createLogger('send-message-service');

/**
 * Send a WhatsApp message (text-only or image+caption).
 *
 * @param {string} sessionName  - Baileys session name (e.g. "session33")
 * @param {string} mobile       - Phone number without + (e.g. "919876543210")
 * @param {string} message      - Text message or caption for the image
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
            // ── Image Message ──────────────────────────────────────────────
            logger.debug({ sessionName, mobile, imageUrl }, 'Sending image message');

            // Download image as buffer (Baileys requires buffer or { url } object)
            // Using { url } is simpler — Baileys will fetch it internally.
            response = await session.sock.sendMessage(jid, {
                image: { url: imageUrl },
                caption: message || '',   // caption is optional
                mimetype: 'image/jpeg',   // Baileys auto-detects from URL if omitted, but being explicit helps
            });
        } else {
            // ── Text-only Message ──────────────────────────────────────────
            response = await session.sock.sendMessage(jid, {
                text: message,
            });
        }

        session.messageCount++;

        logger.debug(
            { sessionName, mobile, messageId: response.key.id, hasImage: !!imageUrl },
            'Message sent successfully'
        );

        return response;
    } catch (error) {
        logger.error(
            { error: error.message, sessionName, mobile, hasImage: !!imageUrl },
            'Failed to send message'
        );
        throw error;
    }
};

module.exports = sendMessage;

