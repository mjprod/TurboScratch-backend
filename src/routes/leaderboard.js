const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

router.post("/", (req, res) => {
    const { limit = 100, page = 1 } = req.body;
    var offset = page;
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

    if (page > 1) offset -= 1

    const countQuery = 'SELECT COUNT(*) as total FROM Leaderboard';

    pool.query(countQuery, (err, countResult) => {
        if (err) {
            console.error("Error fetching count:", err);
            return res.status(500).json({ error: err.message });
        }
        const totalCount = countResult[0].total;

        pool.query(getLeaderBoardQuery, [limit, offset], (err, leaderBoardResult) => {
            if (err) {
                console.error("Error fetching leaderboard data:", err);
                return res.status(500).json({ error: err.message });
            }

            const totalPages = Math.ceil(totalCount / limit);
            return res.status(200).json({
                totalPages,
                currentPage: page,
                data: leaderBoardResult
            });
        });
    });
    
});

module.exports = router;