require('dotenv').config({
    path: require('path').resolve(__dirname, '../../../.env')
});
const dbConnection = require("../../config/dbConnection");
const { getAllSessions } = require("../../config/whatsapp/sessionManager");
const rotationService = require("../../config/whatsapp/rotationService");
const sendMessage = require("../../config/whatsapp/sendMessageService");





const processQueue = async (campaignId, messageTemplate) => {


    console.log(campaignId);
    try {
        const [pendingContacts] = await dbConnection.query(`SELECT * FROM campaign_queue WHERE status = "pending" AND campaign_id=?`, [campaignId]);

        const sessions = getAllSessions();

        const activeChannels = Object.keys(sessions).filter((key) => sessions[key].connected);

        for (const contact of pendingContacts) {
            try {
                const selectedChannel = await rotationService.getNextChannel(activeChannels);

                const response = await sendMessage(selectedChannel, contact.mobile, messageTemplate)

                await dbConnection.query(`UPDATE campaign_queue SET status='sent',sent_flag=1,message_id=?,channel=? WHERE id=?`, [response.key.id, selectedChannel, contact.id])
                await dbConnection.query(`INSERT INTO message_logs (user_id,campaign_id,message_id,recipient,status,message_content,send_time) VALUES(?,?,?,?,?,?,NOW())`, [contact.user_id, contact.campaign_id, response.key.id, contact.mobile, 'sent', messageTemplate]);


                //delay is use to avoid spam detection 
                await delay(4000);
            } catch (error) {
                console.log(error.message);

                await dbConnection.query(`UPDATE campaign_queue SET status='failed',retry_count = retry_count + 1,error_message=? WHERE id=?`, [error.message, contact.id])
            }
        }

    } catch (error) {
        console.log(error.message);
    }

}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}



module.exports = processQueue;