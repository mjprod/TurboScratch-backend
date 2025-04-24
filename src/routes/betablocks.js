// routes/betaBlock.js
const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const moment = require("moment");

// GET all BetaBlocks records
router.get("/", (req, res) => {
    const query = "SELECT * FROM BetaBlocks";
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

    // Check if there's any BetaBlocks whose final date has not been reached yet
    const checkQuery = `
      SELECT * FROM BetaBlocks 
      WHERE date_time_final > NOW()
    `;

    pool.query(checkQuery, (checkErr, activeBlocks) => {
        if (checkErr) {
            console.error("Database error (checking active blocks):", checkErr);
            return res.status(500).json({ error: checkErr.message });
        }

        if (activeBlocks.length > 0) {
            return res.status(400).json({
                error: "An active BetaBlocks already exists. You cannot register a new one until the current one ends.",
            });
        }

        // If no active BetaBlocks exists, proceed with the insertion
        const insertQuery = `
            INSERT INTO BetaBlocks (beta_block_description, date_time_initial, date_time_final)
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
                    message: "BetaBlocks record created successfully!",
                    betaBlockId: results.insertId,
                });
            }
        );
    });
});

// PUT update BetaBlocks record by ID
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { beta_block_description, date_time_initial, date_time_final } = req.body;
    const query = "UPDATE BetaBlocks SET beta_block_description = ?, date_time_initial = ?, date_time_final = ? extended = 'true' WHERE beta_block_id = ?";
    pool.query(query, [beta_block_description, date_time_initial, date_time_final, id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({
            message: "BetaBlocks record updated successfully!",
        });
    });
});

// DELETE BetaBlocks record by ID
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM BetaBlocks WHERE beta_block_id = ?";
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({
            message: "BetaBlocks record deleted successfully!",
        });
    });
});


router.get("/:id/stats", (req, res) => {
    const { id } = req.params;
    const sql = `
       WITH dist AS (
        SELECT
            beta_block_id,
            COUNT(DISTINCT user_id) AS total_players,
            COUNT(*) AS total_games,
            SUM(CASE WHEN lucky_symbol_won = 1 THEN 1 ELSE 0 END) AS lucky_count,
            SUM(CASE WHEN number_combination_total = 4 THEN 1 ELSE 0 END) AS x4_count,
            SUM(CASE WHEN number_combination_total = 3 THEN 1 ELSE 0 END) AS x3_count,
            SUM(CASE WHEN number_combination_total = 2 THEN 1 ELSE 0 END) AS x2_count,
            SUM(CASE WHEN number_combination_total = 1 THEN 1 ELSE 0 END) AS x1_count,
            SUM(CASE WHEN number_combination_total = 0 THEN 1 ELSE 0 END) AS x0_count
        FROM turbo_scratch.Games
        GROUP BY beta_block_id
        )
        SELECT *
        FROM (
        -- Lucky Symbol: percentage of games where lucky_symbol_won = 1
        SELECT 
            beta_block_id,
            total_games,
            'lucky_symbol' AS rule,
            ROUND(100.0 * lucky_count / total_games, 2) / total_players AS measured_pct
        FROM dist
        
        UNION ALL
        
        -- x4: percentage of games with number_combination_total = 4
        SELECT 
            beta_block_id,
            total_games,
            'x4' AS rule,
            ROUND(100.0 * x4_count / total_games, 2) AS measured_pct
        FROM dist
        
        UNION ALL
        
        -- x3: percentage of games with number_combination_total = 3
        SELECT 
            beta_block_id,
            total_games,
            'x3' AS rule,
            ROUND(100.0 * x3_count / total_games, 2) AS measured_pct
        FROM dist
        
        UNION ALL
        
        -- x2: percentage of games with number_combination_total = 2
        SELECT 
            beta_block_id,
            total_games,
            'x2' AS rule,
            ROUND(100.0 * x2_count / total_games, 2) AS measured_pct
        FROM dist
        
        UNION ALL
        
        -- x1: percentage of games with number_combination_total = 1
        SELECT 
            beta_block_id,
            total_games,
            'x1' AS rule,
            ROUND(100.0 * x1_count / total_games, 2) AS measured_pct
        FROM dist
        
        UNION ALL
        
        -- x0: percentage of games with number_combination_total = 0 (i.e., NONE)
        SELECT 
            beta_block_id,
            total_games,
            'x0' AS rule,
            ROUND(100.0 * x0_count / total_games, 2) AS measured_pct
        FROM dist
        ) AS stats
        WHERE stats.beta_block_id = ?
        ORDER BY 
        CASE 
            WHEN rule = 'lucky_symbol' THEN 1
            WHEN rule = 'x4' THEN 2
            WHEN rule = 'x3' THEN 3
            WHEN rule = 'x2' THEN 4
            WHEN rule = 'x1' THEN 5
            WHEN rule = 'x0' THEN 6
            ELSE 7 
        END;
        `;

    pool.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

router.get("/:id/beta_block_header", (req, res) => {
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
        u.email,
        CASE 
            WHEN b.date_time_final > NOW() THEN
            (SELECT COUNT(DISTINCT g.user_id)
            FROM Users g
            WHERE g.current_beta_block = b.beta_block_id)
            ELSE
            (SELECT COUNT(DISTINCT l.user_id)
            FROM Leaderboard l
            WHERE l.beta_block_id = b.beta_block_id)
        END AS total_users
        FROM BetaBlocks b
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
            return res.status(404).json({ error: "No campaign found for the given ID" });
        }

        // Use the first row for campaign details
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

        // Build winners list by filtering rows with non-null week_number.
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

        const output = { nome, datas, week, total_users: campaignRow.total_users, winners };
        res.status(200).json(output);
    });
});


module.exports = router;

