const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const {getCurrentWeekStartDate} = require("../utils/datetime");

router.post("/", (req, res) => {
  const { limit = 100, page = 1 } = req.body;
  var offset = (page - 1) * limit;

  const currentWeekStartDate = getCurrentWeekStartDate();
  console.log("Current week start date:", currentWeekStartDate);
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
        WHERE l.week_start_date LIKE ?
        ORDER BY cr.computed_rank
        LIMIT ? OFFSET ?;
    `;

  const countQuery =
    "SELECT COUNT(*) as total FROM Leaderboard WHERE week_start_date = ?";

  pool.query(countQuery, [currentWeekStartDate], (err, countResult) => {
    if (err) {
      console.error("Error fetching count:", err);
      return res.status(500).json({ error: err.message });
    }
    const totalCount = countResult[0].total;

    pool.query(
      getLeaderBoardQuery,
      [currentWeekStartDate, limit, offset],
      (err, leaderBoardResult) => {
        if (err) {
          console.error("Error fetching leaderboard data:", err);
          return res.status(500).json({ error: err.message });
        }
        console.log("Leaderboard result:", leaderBoardResult);
        const totalPages = Math.ceil(totalCount / limit);
        return res.status(200).json({
          totalPages,
          currentPage: page,
          data: leaderBoardResult,
        });
      }
    );
  });
});

module.exports = router;
