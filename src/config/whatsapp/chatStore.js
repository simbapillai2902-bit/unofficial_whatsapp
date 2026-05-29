const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../logger');

const logger = createLogger('chat-store');

// Keep chat stores loaded in memory for fast access, structure:
// { [sessionName]: { [jid]: [messages] } }
const memoryStores = {};

const getStoreFilePath = (sessionName) => {
    return path.join(process.cwd(), 'session', `${sessionName}_chats.json`);
};

// Load store from disk
const loadStore = (sessionName) => {
    if (memoryStores[sessionName]) {
        return memoryStores[sessionName];
    }

    const filePath = getStoreFilePath(sessionName);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            memoryStores[sessionName] = JSON.parse(data);
            logger.info({ sessionName }, 'Loaded chat history from file');
        } else {
            memoryStores[sessionName] = {};
        }
    } catch (error) {
        logger.error({ sessionName, error: error.message }, 'Failed to load chat store from file, starting fresh');
        memoryStores[sessionName] = {};
    }

    return memoryStores[sessionName];
};

// Save store to disk (non-blocking)
const saveStore = (sessionName) => {
    const store = memoryStores[sessionName];
    if (!store) return;

    const filePath = getStoreFilePath(sessionName);
    // Ensure parent directory exists (session/)
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8', (err) => {
        if (err) {
            logger.error({ sessionName, error: err.message }, 'Failed to write chat store to disk');
        } else {
            logger.debug({ sessionName }, 'Saved chat store to disk');
        }
    });
};

// Extract textual content from a Baileys message object
const getMessageText = (message) => {
    if (!message) return '';
    if (typeof message === 'string') return message;
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    // Template messages and reply buttons
    if (message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
    if (message.templateButtonReplyMessage?.selectedId) return message.templateButtonReplyMessage.selectedId;
    
    // Fallbacks
    return '';
};

// Add a message to the store
const addMessage = (sessionName, msg) => {
    const jid = msg.key?.remoteJid;
    if (!jid) return;

    const store = loadStore(sessionName);
    if (!store[jid]) {
        store[jid] = [];
    }

    // Check for duplicates
    const exists = store[jid].some(m => m.key?.id === msg.key?.id || m.id === msg.key?.id);
    if (!exists) {
        const text = getMessageText(msg.message);
        
        const cleanMsg = {
            id: msg.key.id,
            fromMe: msg.key.fromMe || false,
            type: msg.key.fromMe ? 'outgoing' : 'incoming',
            sender: msg.key.fromMe ? 'me' : (msg.key.participant || msg.key.remoteJid || '').split('@')[0],
            text: text,
            timestamp: msg.messageTimestamp ? parseInt(msg.messageTimestamp) : Math.floor(Date.now() / 1000),
            raw: msg
        };

        store[jid].push(cleanMsg);

        // Keep last 200 messages per chat
        if (store[jid].length > 200) {
            store[jid].shift();
        }

        saveStore(sessionName);
    }
};

// Get all chats/messages for a session and phone number
const getChatsForPhone = (sessionName, phone) => {
    const store = loadStore(sessionName);
    
    // Normalize phone number to JID format
    const cleanPhone = phone.replace(/\D/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;
    const groupJid = `${cleanPhone}@g.us`;
    
    const messages = store[jid] || store[groupJid] || [];
    
    // Ensure all messages have explicit type and sender fields for UI rendering
    return messages.map(msg => {
        const fromMe = msg.fromMe || false;
        return {
            id: msg.id,
            fromMe: fromMe,
            type: msg.type || (fromMe ? 'outgoing' : 'incoming'),
            sender: msg.sender || (fromMe ? 'me' : (msg.raw?.key?.participant || msg.raw?.key?.remoteJid || '').split('@')[0] || cleanPhone),
            text: msg.text,
            timestamp: msg.timestamp,
            raw: msg.raw || msg
        };
    });
};

// Clean up memory store when session is deleted
const clearStoreFromMemory = (sessionName) => {
    delete memoryStores[sessionName];
};

module.exports = {
    addMessage,
    getChatsForPhone,
    clearStoreFromMemory,
    getMessageText
};
