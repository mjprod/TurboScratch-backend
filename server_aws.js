const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create a connection pool to handle multiple requests and auto-reconnect
const pool = mysql.createPool({
  connectionLimit: 10, // Adjust the pool size to your needs
  host: "turboscratch.cv0ceas0621b.ap-southeast-2.rds.amazonaws.com",
  user: "admin",
  password: "qazwsxedc123",
  database: "turbo_scratch",
  timezone: 'Z'
});

// Endpoint de health check do servidor
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy!" });
});

// Endpoint de health check para o banco de dados
app.get("/health/db", (req, res) => {
  pool.query("SELECT 1", (err) => {
    if (err) {
      return res.status(500).json({ message: "Database connection failed", error: err });
    }
    res.status(200).json({ message: "Database is healthy!" });
  });
});

// Endpoint to fetch user details by user_id
// To register a new user, include 'name' and 'email' as query parameters (e.g. /users/1?name=John&email=john@example.com)
app.post("/users", (req, res) => {
  const { user_id, name, email } = req.body;

  // Get current date/time in UTC in the format "YYYY-MM-DD HH:MM:SS"
  const nowUTC = new Date().toISOString().slice(0, 19).replace('T', ' ');
  console.log("nowUTC:", nowUTC);

  // 1. Check if there is an active campaign (BetaBlock) based on the current UTC date/time
  const campaignQuery = `
    SELECT * FROM BetaBlock 
    WHERE ? BETWEEN date_time_initial AND date_time_final
    ORDER BY beta_block_id DESC
    LIMIT 1
  `;
  pool.query(campaignQuery, [nowUTC], (err, campaigns) => {
    if (err) {
      console.error("Error checking campaign:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("Campaigns found:", campaigns);
    const activeCampaign = campaigns.length ? campaigns[0] : null;
    if (activeCampaign) {
      console.log("Active campaign found. ID:", activeCampaign.beta_block_id);
    } else {
      console.log("No active campaign found.");
      // Return a message indicating the user is out of campaign
      return res.status(200).json({
        message: "Out of campaign",
      });
    }

    // 2. Query the user from the Users table
    const userQuery = "SELECT * FROM Users WHERE user_id = ?";
    pool.query(userQuery, [user_id], (err, userResults) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ error: err.message });
      }

      if (userResults.length === 0) {
        // User not found: create one using provided name and email (or default values)
        console.log("User not found, creating new user...");
        const userName = name;
        const userEmail = email;
        const insertQuery = `
          INSERT INTO Users (user_id, name, email, total_score, lucky_symbol_balance, ticket_balance, card_balance, current_beta_block)
          VALUES (?, ?, ?, 0, 0, 0, 0, NULL)
        `;
        pool.query(insertQuery, [user_id, userName, userEmail], (err, insertResult) => {
          if (err) {
            console.error("Error inserting user:", err);
            return res.status(500).json({ error: err.message });
          }
          pool.query(userQuery, [user_id], (err, newUserResults) => {
            if (err) {
              console.error("Error fetching new user:", err);
              return res.status(500).json({ error: err.message });
            }
            console.log("New user created:", newUserResults[0]);
            // After creating the user, fetch their daily data
            fetchDailyDataAndReturn(newUserResults[0], activeCampaign, res);
          });
        });
      } else {
        // User exists
        let user = userResults[0];
        console.log("User found:", user);

        if (activeCampaign) {
          // If the active campaign is different from the user's current_beta_block (or if it is null)
          if (user.current_beta_block !== activeCampaign.beta_block_id) {
            console.log(
              `Updating user: current_beta_block (${user.current_beta_block}) is different from activeCampaign (${activeCampaign.beta_block_id}).`
            );
            const updateQuery = `
              UPDATE Users 
              SET total_score = 0, lucky_symbol_balance = 0, ticket_balance = 0, card_balance = 0, current_beta_block = ?,
                  update_at = CURRENT_TIMESTAMP
              WHERE user_id = ?
            `;
            pool.query(updateQuery, [activeCampaign.beta_block_id, user_id], (err, updateResult) => {
              if (err) {
                console.error("Error updating user:", err);
                return res.status(500).json({ error: err.message });
              }
              console.log("User updated, update result:", updateResult);
              pool.query(userQuery, [user_id], (err, updatedUserResults) => {
                if (err) {
                  console.error("Error fetching updated user:", err);
                  return res.status(500).json({ error: err.message });
                }
                console.log("User after update:", updatedUserResults[0]);
                // Now fetch daily data and return the result
                fetchDailyDataAndReturn(updatedUserResults[0], activeCampaign, res);
              });
            });
          } else {
            console.log("current_beta_block is already updated with the active campaign.");
            // Fetch daily data and return the result with the existing user data
            fetchDailyDataAndReturn(user, activeCampaign, res);
          }
        } else {
          console.log("No active campaign, returning user without changes.");
          return res.status(200).json({ user });
        }
      }
    });
  });
});

// Helper function to fetch daily data for the active campaign period, grouped by week, and return the response
function fetchDailyDataAndReturn(user, activeCampaign, res) {
  // Query to group daily records by week (using WEEK() with mode 1 for ISO week numbers)
  const dailyQuery = `
    SELECT WEEK(create_at, 1) AS week, 
           COUNT(*) AS total_entries,
           GROUP_CONCAT(DATE(create_at) ORDER BY create_at ASC) AS days
    FROM Daily
    WHERE user_id = ? 
      AND create_at BETWEEN ? AND ?
    GROUP BY week
    ORDER BY week ASC;
  `;

  pool.query(
    dailyQuery,
    [user.user_id, activeCampaign.date_time_initial, activeCampaign.date_time_final],
    (err, dailyGroupedResults) => {
      if (err) {
        console.error("Error fetching grouped daily data:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("Daily data grouped by week:", dailyGroupedResults);
      return res.status(200).json({ user, daily: dailyGroupedResults });
    }
  );
}

// Endpoint para criar um registro na tabela Daily
app.post("/daily", (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }
  const query = "INSERT INTO Daily (user_id) VALUES (?)";
  pool.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Daily record created successfully!", dailyId: results.insertId });
  });
});

// Endpoint para criar um registro na tabela BetaBlock
app.post("/betaBlock", (req, res) => {
  const { beta_block_description, date_time_initial, date_time_final } = req.body;
  if (!beta_block_description || !date_time_initial || !date_time_final) {
    return res.status(400).json({ error: "beta_block_description, date_time_initial, and date_time_final are required" });
  }
  const query = "INSERT INTO BetaBlock (beta_block_description, date_time_initial, date_time_final) VALUES (?, ?, ?)";
  pool.query(query, [beta_block_description, date_time_initial, date_time_final], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "BetaBlock record created successfully!", betaBlockId: results.insertId });
  });
});

// Endpoint para criar um registro na tabela Game
app.post("/game", (req, res) => {
  const { beta_block_id, user_id, lucky_symbol_won, number_combination_total, number_combination_user_played } = req.body;
  if (!beta_block_id || !user_id) {
    return res.status(400).json({ error: "beta_block_id and user_id are required" });
  }
  const query = `INSERT INTO Game (beta_block_id, user_id, lucky_symbol_won, number_combination_total, number_combination_user_played)
                 VALUES (?, ?, ?, ?, ?)`;
  pool.query(query, [beta_block_id, user_id, lucky_symbol_won, number_combination_total, number_combination_user_played], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Game record created successfully!", gameId: results.insertId });
  });
});

// Fechamento gracioso da aplicação e conexão com o banco
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  pool.end((err) => {
    if (err) {
      console.error('Error closing MySQL connection:', err);
    }
    process.exit();
  });
});

// Inicia o servidor na porta 8083
const port = 8083;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});