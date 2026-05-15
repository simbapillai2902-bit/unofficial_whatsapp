const { getSession } = require("./sessionManager.js");
const { createLogger } = require("../../logger");

const logger = createLogger('send-message-service');

const sendMessage = async (sessionName, mobile, message) => {
    try {
        if (!mobile || !message) {
            throw new Error('Mobile number and message are required');
        }

        if (message.length > 4096) {
            throw new Error('Message too long (max 4096 characters)');
        }
        
        console.log(sessionName);
        const session = getSession(sessionName);

        if (!session) {
            throw new Error(`Session not found: ${sessionName}`);
        }

        if (!session.connected) {
            throw new Error(`Session not connected: ${sessionName}`);
        }

        const jid = `${mobile}@s.whatsapp.net`;

        const response = await session.sock.sendMessage(jid, {
            text: message,
        });

        session.messageCount++;
        
        logger.debug(
            { sessionName, mobile, messageId: response.key.id },
            'Message sent successfully'
        );

        return response;
    } catch (error) {
        logger.error(
            { error: error.message, sessionName, mobile },
            'Failed to send message'
        );
        throw error;
    }
};

module.exports = sendMessage;
