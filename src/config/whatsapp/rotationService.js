class RotationService {
    constructor() {
        this.currentIndex = 0;
        this.messageCount = 0;
    }

    async getNextChannel(channels) {
        if (!channels.length) {
            throw new Error(`No active channels avaliable`);
        }

        if (this.messageCount >= 100) {
            this.currentIndex = (this.currentIndex + 1) % channels.length;
            this.messageCount = 0 ;
        }

        const channel  = channels[this.currentIndex];
        this.messageCount++;

        return channel;
    }
}

module.exports = new RotationService();