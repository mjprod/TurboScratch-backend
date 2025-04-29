const pool = require("../configs/db");

const getCurrentActiveBetaBlock = async (completion) => {
    const campaignQuery = `
      SELECT * FROM BetaBlocks 
      WHERE ? BETWEEN date_time_initial AND date_time_final
      ORDER BY beta_block_id DESC
      LIMIT 1
    `;
    try {
        const nowUTC = new Date().toISOString().slice(0, 19).replace("T", " ");
        const [campaigns] = await pool.promise().query(campaignQuery, [nowUTC]);
        const activeCampaign = campaigns.length ? campaigns[0] : null;
        if (activeCampaign) {
            console.log("Active campaign found. ID:", activeCampaign.beta_block_id);
            completion(undefined, activeCampaign)
        } else {
            console.log("Active campaign found. ID:", activeCampaign.beta_block_id);
            completion(err, undefined)
        }
    } catch (err) {
        console.error("Error checking campaign:", err);
        completion(err, undefined)
    }
}

const getCurrentWeek = async (completion) => {
    getCurrentActiveBetaBlock((err, activeCampaign) => {
        if (err) return callback(err)
        const campaignStart = new Date(activeCampaign.date_time_initial);
        const today = new Date();

        const daysSinceStart = Math.floor(
            (today - campaignStart) / (1000 * 60 * 60 * 24)
        );

        const currentWeek = Math.floor(daysSinceStart / 7) + 1;
        return completion(undefined, currentWeek)
    })
}

module.exports = { getCurrentActiveBetaBlock, getCurrentWeek };