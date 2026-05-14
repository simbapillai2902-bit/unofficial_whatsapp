const processQueue = require('../campaign/queueProcessor.js');

console.log('Campaign Worker Started');

setInterval(async () => {
    await processQueue();
}, 5000);