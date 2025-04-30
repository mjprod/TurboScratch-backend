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
      console.log("Updating week for unplayed games where user has sufficient card balance");
      await db.query(`
      WITH counts AS (
        SELECT user_id, COUNT(*) AS unplayed_count
        FROM Games
        WHERE played = 0
        GROUP BY user_id
      )
      UPDATE Games AS g
      INNER JOIN Users AS u ON g.user_id = u.user_id
      INNER JOIN counts ON counts.user_id = g.user_id
      SET g.week = ?
      WHERE g.played = 0
        AND g.beta_block_id = ?
        AND counts.unplayed_count >= u.card_balance;
      `, [currentWeek, activeCampaign.beta_block_id]);

      await db.query(`
        UPDATE Users AS u
        INNER JOIN (
          SELECT user_id, COUNT(*) AS new_balance
          FROM Games
          WHERE played = 0
            AND beta_block_id = ?
            AND week = ?
          GROUP BY user_id
        ) AS g2 ON u.user_id = g2.user_id
        SET u.card_balance = g2.new_balance;
      `, [activeCampaign.beta_block_id, currentWeek]);
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