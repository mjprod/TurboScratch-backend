const express = require("express");
const pool = require("../configs/db");
const { getCurrentWeek } = require("../utils/datetime");
const router = express.Router();

router.get("/", (req, res) => {
    // Get current date/time in UTC in the format "YYYY-MM-DD HH:MM:SS"
    const nowUTC = new Date().toISOString().slice(0, 19).replace("T", " ");
    console.log("nowUTC:", nowUTC);

    // 1. Check if there is an active campaign (BetaBlocks) based on the current UTC date/time
    const campaignQuery = `
      SELECT * FROM BetaBlocks 
      WHERE ? BETWEEN date_time_initial AND date_time_final
      ORDER BY beta_block_id DESC
      LIMIT 1
    `;
    pool.query(campaignQuery, [nowUTC], (err, campaigns) => {
        if (err) {
            console.error("Error checking campaign:", err);
            return res.status(500).json({ error: err.message });
        }

        const activeCampaign = campaigns.length ? campaigns[0] : null;
        if (!activeCampaign) {
            console.log("No active campaign found.");
            return res.status(200).json({ message: "Out of campaign" });
        }

        console.log("Active campaign found. ID:", activeCampaign.beta_block_id);

        // 2. Calculate the current week of the campaign using the campaign start date.
        const currentWeek = getCurrentWeek(activeCampaign.date_time_initial)
        console.log("Calculated current week:", currentWeek);

        // 3. Query a random user from the Users table.
        const userQuery = `SELECT *
            FROM (
            SELECT u.*
            FROM Users u
            JOIN (
                SELECT units.n + tens.n + hundreds.n AS n
                FROM 
                (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) units,
                (SELECT 0 AS n UNION ALL SELECT 10 UNION ALL SELECT 20 UNION ALL SELECT 30 UNION ALL SELECT 40
                UNION ALL SELECT 50 UNION ALL SELECT 60 UNION ALL SELECT 70 UNION ALL SELECT 80 UNION ALL SELECT 90) tens,
                (SELECT 0 AS n UNION ALL SELECT 100 UNION ALL SELECT 200 UNION ALL SELECT 300 UNION ALL SELECT 400
                UNION ALL SELECT 500 UNION ALL SELECT 600 UNION ALL SELECT 700 UNION ALL SELECT 800 UNION ALL SELECT 900) hundreds
            ) nums
            ON nums.n < u.ticket_balance
            ) expanded
            ORDER BY RAND()
            LIMIT 1;`;

        pool.query(userQuery, (err, userResults) => {
            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).json({ error: err.message });
            }

            if (!userResults.length) {
                return res.status(404).json({ message: "No user found" });
            }

            const user = userResults[0];
            console.log("User found:", user);

            // 4. Check if a winner already exists for this campaign and week.
            const checkWinnerQuery = `
              SELECT * FROM Winners
              WHERE beta_block_id = ? AND week_number = ?
              LIMIT 1
            `;
            pool.query(checkWinnerQuery, [activeCampaign.beta_block_id, currentWeek], (err, winnerResults) => {
                if (err) {
                    console.error("Error checking winner:", err);
                    return res.status(500).json({ error: err.message });
                }

                if (winnerResults.length) {
                    // Winner exists; return that winner.
                    console.log("Winner already exists:", winnerResults[0]);
                    return res.status(200).json({ winner: winnerResults[0] });
                } else {
                    // 5. If no winner exists, insert the new winner into the Winners table.
                    const insertWinnerQuery = `
                      INSERT INTO Winners (user_id, beta_block_id, week_number)
                      VALUES (?, ?, ?)
                    `;
                    pool.query(insertWinnerQuery, [user.user_id, activeCampaign.beta_block_id, currentWeek], (err, insertResult) => {
                        if (err) {
                            console.error("Error inserting winner:", err);
                            return res.status(500).json({ error: err.message });
                        }

                        console.log("Winner inserted, ID:", insertResult.insertId);
                        return res.status(201).json({
                            winner_id: insertResult.insertId,
                            user,
                            beta_block_id: activeCampaign.beta_block_id,
                            week_number: currentWeek
                        });
                    });
                }
            });
        });
    });
});

module.exports = router;