const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

router.post("/", (req, res) => {
  const { beta_block_id, limit = 100, page = 1 } = req.body;
  var offset = (page - 1) * limit;

  const getLeaderBoardQuery = `
        WITH computed_ranks AS (
            SELECT 
                user_id,
                name,
                total_score,
                RANK() OVER (ORDER BY total_score DESC) AS computed_rank
            FROM Users
        ),
        latest_leaderboard AS (
            SELECT *
            FROM Leaderboard
            WHERE week_start_date = (SELECT MAX(week_start_date) FROM Leaderboard)
              AND beta_block_id = ?
        )
        SELECT 
            cr.user_id,
            cr.name,
            ll.week_start_date,
            cr.total_score,
            cr.computed_rank AS current_rank,
            ll.previous_rank AS snapshot_rank,
            CASE
                WHEN ll.previous_rank IS NULL THEN 'new'
                WHEN cr.computed_rank < ll.previous_rank THEN 'up'
                WHEN cr.computed_rank > ll.previous_rank THEN 'down'
                ELSE 'same'
            END AS trend
        FROM computed_ranks cr
        LEFT JOIN latest_leaderboard ll 
            ON ll.user_id = cr.user_id
        ORDER BY cr.computed_rank
        LIMIT ? OFFSET ?;
    `;

  pool.query(getLeaderBoardQuery, [beta_block_id, limit, offset], (err, leaderBoardResult) => {
    if (err) {
      console.error("Error fetching leaderboard data:", err);
      return res.status(500).json({ error: err.message });
    }
    pool.query("SELECT COUNT(*) AS total FROM Users;", (err, userResult) => {
      console.log(userResult[0].total)
      const totalPages = Math.ceil(userResult[0].total / limit);
      return res.status(200).json({
        totalPages,
        currentPage: page,
        data: leaderBoardResult,
      });
    });
  });
});

module.exports = router;
