class RotationService {
    constructor() {
        this.currentIndex = 0;
        this.messageCount = 0;
    }

    async getNextChannel(channels, limitPerChannel = 100) {
        if (!channels.length) {
            throw new Error(`No active channels avaliable`);
        }

        // Defensive check: reset to 0 if currentIndex goes out of bounds due to channel disconnects
        if (this.currentIndex >= channels.length) {
            this.currentIndex = 0;
        }

        if (this.messageCount >= limitPerChannel) {
            this.currentIndex = (this.currentIndex + 1) % channels.length;
            this.messageCount = 0 ;
        }

        const channel  = channels[this.currentIndex];
        this.messageCount++;

        return channel;
    }
}

module.exports = new RotationService();