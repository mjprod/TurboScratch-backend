const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

router.post("/", (req, res) => {
    const { limit = 100, offset = 0 } = req.body;

    const getLeaderBoardQuery = `
        SELECT user_id,
        week_start_date,
        score,
        current_rank,
        previous_rank,
        CASE 
            WHEN previous_rank IS NULL THEN 'N/A'
            WHEN current_rank < previous_rank THEN 'up'
            WHEN current_rank > previous_rank THEN 'down'
            ELSE 'same'
        END AS trend
        FROM Leaderboard
        LIMIT ? OFFSET ?;
    `;

    pool.query(getLeaderBoardQuery, [limit, offset], (err, leaderBoardResult) => {
        if (err) {
            console.error("Error Getting leaderboard data:", err);
            return res.status(500).json({ error: err.message });
        }

        return res.status(200).json({
            ...leaderBoardResult,
        });
    });
});

module.exports = router;