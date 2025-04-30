const { getCurrentWeek } = require("../src/utils/datetime");

module.exports = {
  up: async (db) => {
    await db.query(`
          ALTER TABLE Games
          ADD COLUMN week INT DEFAULT 0;
        `);
    const nowUTC = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [campaigns] = await db.query(`
        SELECT * FROM BetaBlocks 
        WHERE ? BETWEEN date_time_initial AND date_time_final
        ORDER BY beta_block_id DESC
        LIMIT 1`, [nowUTC]
    );
    const activeCampaign = campaigns.length ? campaigns[0] : null;
    if (activeCampaign) {
      console.log("Active campaign found. ID:", activeCampaign.beta_block_id);
      const currentWeek = getCurrentWeek(activeCampaign.date_time_initial)
      console.log("Updating week id to current ID");
      await db.query(`
          UPDATE Games
          SET week = ?
          WHERE played = 0 AND beta_block_id = ?
        `, [currentWeek, activeCampaign.beta_block_id]);
    } else {
      console.log("Active campaign found. ID:", activeCampaign.beta_block_id);
    }
  },
  down: async (db) => {
    await db.query(`
          ALTER TABLE Games
          DROP COLUMN week;
        `);
  }
};