const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

router.post("/", (req, res) => {
  const { limit = 100, page = 1 } = req.body;
  var offset = (page - 1) * limit;

  const getLeaderBoardQuery = `
        WITH computed_ranks AS (
            SELECT 
                user_id,
                name,
                total_score,
                RANK() OVER (ORDER BY total_score DESC) AS computed_rank
            FROM Users
        )
        SELECT 
        l.user_id,
        cr.name,
        l.week_start_date,
        cr.total_score,
        cr.computed_rank AS current_rank,
        l.current_rank AS snapshot_rank,
            CASE
                WHEN l.current_rank IS NULL THEN 'N/A'
                WHEN cr.computed_rank < l.current_rank THEN 'up'
                WHEN cr.computed_rank > l.current_rank THEN 'down'
                ELSE 'same'
            END AS trend
        FROM Leaderboard l
        JOIN computed_ranks cr ON l.user_id = cr.user_id
        WHERE l.week_start_date = (SELECT MAX(week_start_date) FROM Leaderboard)
        ORDER BY cr.computed_rank
        LIMIT ? OFFSET ?;
    `;

  pool.query(getLeaderBoardQuery, [limit, offset], (err, leaderBoardResult) => {
    if (err) {
      console.error("Error fetching leaderboard data:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("Leaderboard result:", leaderBoardResult);
    const totalPages = Math.ceil(leaderBoardResult.length / limit);
    return res.status(200).json({
      totalPages,
      currentPage: page,
      data: leaderBoardResult,
    });
  });
});

module.exports = router;
