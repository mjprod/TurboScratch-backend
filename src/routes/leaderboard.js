const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

router.post("/", (req, res) => {
    const { limit = 100 } = req.body;

    const getLeaderBoardQuery = `
      SELECT user_id, name, total_score, RANK() OVER(ORDER BY total_score DESC) AS 'rank'
      FROM Users
      LIMIT ?;
    `;

    pool.query(getLeaderBoardQuery, [limit], (err, leaderBoardResult) => {
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