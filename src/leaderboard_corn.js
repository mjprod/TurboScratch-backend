const cron = require('node-cron');
const mysql = require('mysql2/promise');

// Create a connection pool to your database.
const pool = mysql.createPool({
  host: 'localhost',
  user: 'yourusername',
  password: 'yourpassword',
  database: 'yourdatabase'
});

// Helper function to compute the week start date (adjust logic as needed)
function getCurrentWeekStartDate() {
  const now = new Date();
  // Assuming weeks start on Sunday:
  const day = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// Schedule the job to run every Sunday at midnight (server time)
cron.schedule('0 0 * * 0', async () => {
  const weekStartDate = getCurrentWeekStartDate();
  try {
    const connection = await pool.getConnection();

    // SQL to insert a snapshot into your leaderboard table.
    const sql = `
        INSERT INTO Leaderboard (user_id, week_start_date, score, current_rank, previous_rank)
        SELECT 
            user.user_id,
            '2025-03-16' AS week_start_date,
            user.total_score,
            RANK() OVER (ORDER BY user.total_score DESC) AS current_rank,
            (SELECT current_rank 
            FROM Leaderboard 
            WHERE user_id = user.user_id 
            AND week_start_date = DATE_SUB('2025-03-16', INTERVAL 7 DAY)
            ) AS previous_rank
        FROM Users user;
    `;
    await connection.execute(sql, [weekStartDate, weekStartDate]);
    connection.release();
    console.log(`Weekly snapshot inserted for week starting ${weekStartDate}`);
  } catch (error) {
    console.error('Error updating weekly leaderboard snapshot:', error);
  }
});