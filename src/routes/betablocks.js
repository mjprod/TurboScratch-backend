// routes/betaBlock.js
const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const moment = require("moment");

// GET all BetaBlock records
router.get("/", (req, res) => {
    const query = "SELECT * FROM BetaBlock";
    pool.query(query, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

router.post("/insert", (req, res) => {
    const { beta_block_description, date_time_initial, date_time_final } = req.body;

    if (!beta_block_description || !date_time_initial || !date_time_final) {
        return res.status(400).json({
            error: "beta_block_description, date_time_initial, and date_time_final are required",
        });
    }

    // Check if there's any BetaBlock whose final date has not been reached yet
    const checkQuery = `
      SELECT * FROM BetaBlock 
      WHERE date_time_final > NOW()
    `;

    pool.query(checkQuery, (checkErr, activeBlocks) => {
        if (checkErr) {
            console.error("Database error (checking active blocks):", checkErr);
            return res.status(500).json({ error: checkErr.message });
        }

        if (activeBlocks.length > 0) {
            return res.status(400).json({
                error: "An active BetaBlock already exists. You cannot register a new one until the current one ends.",
            });
        }

        // If no active BetaBlock exists, proceed with the insertion
        const insertQuery = `
        INSERT INTO BetaBlock (beta_block_description, date_time_initial, date_time_final)
        VALUES (?, ?, ?)
      `;
        pool.query(
            insertQuery,
            [beta_block_description, date_time_initial, date_time_final],
            (err, results) => {
                if (err) {
                    console.error("Database error (insert):", err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(200).json({
                    message: "BetaBlock record created successfully!",
                    betaBlockId: results.insertId,
                });
            }
        );
    });
});

// PUT update BetaBlock record by ID
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { beta_block_description, date_time_initial, date_time_final } = req.body;
    const query = "UPDATE BetaBlock SET beta_block_description = ?, date_time_initial = ?, date_time_final = ? WHERE beta_block_id = ?";
    pool.query(query, [beta_block_description, date_time_initial, date_time_final, id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({
            message: "BetaBlock record updated successfully!",
        });
    });
});

// DELETE BetaBlock record by ID
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM BetaBlock WHERE beta_block_id = ?";
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({
            message: "BetaBlock record deleted successfully!",
        });
    });
});


router.get("/:id/stats", (req, res) => {
    const { id } = req.params;
    const sql = `
    WITH dist AS (
      SELECT
        beta_block_id,
        COUNT(*) AS total_games,
        ROUND(100.0 * SUM(CASE WHEN lucky_symbol_won = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS measured_lucky_symbol_pct,
        ROUND(100.0 * SUM(CASE WHEN lucky_symbol_won = 0 AND number_combination_total = 4 THEN 1 ELSE 0 END) / COUNT(*), 2) AS measured_x4_pct,
        ROUND(100.0 * SUM(CASE WHEN lucky_symbol_won = 0 AND number_combination_total = 3 THEN 1 ELSE 0 END) / COUNT(*), 2) AS measured_x3_pct,
        ROUND(100.0 * SUM(CASE WHEN lucky_symbol_won = 0 AND number_combination_total = 2 THEN 1 ELSE 0 END) / COUNT(*), 2) AS measured_x2_pct,
        ROUND(100.0 * SUM(CASE WHEN lucky_symbol_won = 0 AND number_combination_total = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS measured_x1_pct,
        ROUND(100.0 * SUM(CASE WHEN lucky_symbol_won = 0 AND number_combination_total = 0 THEN 1 ELSE 0 END) / COUNT(*), 2) AS measured_none_pct
      FROM turbo_scratch.Game
      GROUP BY beta_block_id
    )
    SELECT *
    FROM (
      SELECT beta_block_id, total_games, 'lucky_symbol' AS rule, measured_lucky_symbol_pct AS measured_pct, 5.00 AS desired_pct FROM dist
      UNION ALL
      SELECT beta_block_id, total_games, 'x4' AS rule, measured_x4_pct AS measured_pct, 10.00 AS desired_pct FROM dist
      UNION ALL
      SELECT beta_block_id, total_games, 'x3' AS rule, measured_x3_pct AS measured_pct, 30.00 AS desired_pct FROM dist
      UNION ALL
      SELECT beta_block_id, total_games, 'x2' AS rule, measured_x2_pct AS measured_pct, 25.00 AS desired_pct FROM dist
      UNION ALL
      SELECT beta_block_id, total_games, 'x1' AS rule, measured_x1_pct AS measured_pct, 20.00 AS desired_pct FROM dist
      UNION ALL
      SELECT beta_block_id, total_games, 'NONE' AS rule, measured_none_pct AS measured_pct, 10.00 AS desired_pct FROM dist
    ) AS stats
    WHERE stats.beta_block_id = ?
    ORDER BY stats.beta_block_id, stats.rule;
  `;

    pool.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

router.get("/:id/winners", (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT 
          b.beta_block_id,
          b.beta_block_description,
          b.date_time_initial,
          b.date_time_final,
          w.week_number,
          w.user_id AS winner_user_id,
          u.name,
          u.email
        FROM BetaBlock b
        LEFT JOIN Winners w 
          ON b.beta_block_id = w.beta_block_id
        LEFT JOIN Users u
          ON w.user_id = u.user_id
        WHERE b.beta_block_id = ?
        ORDER BY w.week_number;
    `;

    pool.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }

        if (!results || results.length === 0) {
            // If no campaign is found, return 404
            return res.status(404).json({ error: "No campaign found for the given ID" });
        }

        // Use the first row for campaign details (even if winners data is null)
        const campaignRow = results[0];
        const nome = campaignRow.beta_block_description;
        const datas = {
            start: campaignRow.date_time_initial,
            end: campaignRow.date_time_final,
        };

        const start = moment(campaignRow.date_time_initial);
        const end = moment(campaignRow.date_time_final);
        const totalWeeks = end.diff(start, "weeks");
        const now = moment();
        let currentWeek = null;
        if (now.isBetween(start, end, null, "[]")) {
            currentWeek = now.diff(start, "weeks") + 1;
        }
        const week = {
            total: totalWeeks,
            current: currentWeek,
        };

        // Build winners list. If there are no winners, results might contain one row with null values.
        // Filter out rows where week_number is null.
        const winners = results
            .filter(row => row.week_number !== null)
            .map(row => ({
                week: row.week_number,
                winner: {
                    user_id: row.winner_user_id,
                    name: row.name,
                    email: row.email,
                },
            }));

        const output = { nome, datas, week, winners };
        res.status(200).json(output);
    });
});


module.exports = router;

