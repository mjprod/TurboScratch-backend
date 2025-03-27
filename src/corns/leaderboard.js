const cron = require("node-cron");
const pool = require("../configs/db");
const { getCurrentWeekStartDate } = require("../utils/datetime");

const startLeaderboardCronJob = (dateTime = "0 18 * * 0") => {
  cron.schedule(dateTime, async () => {
    const weekStartDate = getCurrentWeekStartDate();
    try {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to database:", err);
          return;
        }
        const sql = `
        INSERT INTO Leaderboard (user_id, week_start_date, score, current_rank, previous_rank)
        SELECT 
            user.user_id,
            ? AS week_start_date,
            user.total_score,
            RANK() OVER (ORDER BY user.total_score DESC) AS current_rank,
            (SELECT current_rank 
            FROM Leaderboard 
            WHERE user_id = user.user_id 
            AND week_start_date = DATE_SUB(?, INTERVAL 7 DAY)
            ) AS previous_rank
        FROM Users user;
    `;
        connection.execute(sql, [weekStartDate, weekStartDate]);
        connection.release();
        console.log(
          `Weekly snapshot inserted for week starting ${weekStartDate}`
        );
      });
      console.log(`Running cron job at ${new Date().toISOString()}`);
    } catch (error) {
      console.error("Error updating weekly leaderboard snapshot:", error);
    }
  });
};

module.exports = startLeaderboardCronJob;
