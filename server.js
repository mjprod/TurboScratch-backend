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
  host: "156.67.222.52",
  user: "u552141195_fun_user",
  password: "Fun_@pp_2024",
  database: "u552141195_fun_app",
});

// Health check endpoint to test server
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy!" });
});

// Optionally, you can also check the database connection health
app.get("/health/db", (req, res) => {
  pool.query("SELECT 1", (err) => {
    if (err) {
      return res.status(500).json({ message: "Database connection failed" });
    }
    res.status(200).json({ message: "Database is healthy!" });
  });
});

// Route to save user data
app.post("/save", (req, res) => {
  const { name, email } = req.body;

  // Check if name and email are provided
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  // Insert the data into the database
  const query = "INSERT INTO user (name, email) VALUES (?, ?)";
  pool.query(query, [name, email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "User saved!" });
  });
});

// Route to fetch user details by ID
app.post("/user_details", (req, res) => {
  const { user_id, utc_date } = req.body;

  // Validate if ID and UTC date are provided
  if (!user_id || !utc_date) {
    return res.status(400).json({ error: "User ID and UTC date are required" });
  }

  // Query to fetch user details and match the correct round
  const query = `
    SELECT 
      u.full_name, 
      u.total_score, 
      u.lucky_symbol_balance, 
      u.ticket_balance, 
      u.card_balance, 
      r.round_id, 
      r.round_name
    FROM users u
    LEFT JOIN rounds r ON u.round_id = r.round_id 
    WHERE u.user_id = ? 
    AND ? BETWEEN r.round_initial_date AND r.round_finished_date
  `;

  pool.query(query, [user_id, utc_date], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }

    // Check if any user was found
    if (results.length === 0) {
      return res.status(404).json({ message: "User or active round not found" });
    }

    // Return user details including round info
    res.status(200).json({ user: results[0] });
  });
});

// Endpoint to update the user's number of tickets
app.post("/updateTicket", (req, res) => {
  const { id, tickets } = req.body;

  if (!id || tickets === undefined) {
    return res.status(400).json({ error: "User ID and tickets are required" });
  }

  const query = "UPDATE user SET tickets = ? WHERE id = ?";
  pool.query(query, [tickets, id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to update tickets" });
    }

    res.status(200).json({ message: "Tickets updated successfully!" });
  });
});

// Endpoint to update the user's score
app.post("/updateScore", (req, res) => {
  const { id, score } = req.body;

  if (!id || score === undefined) {
    return res.status(400).json({ error: "User ID and score are required" });
  }

  const query = "UPDATE user SET score = ? WHERE id = ?";
  pool.query(query, [score, id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to update score" });
    }

    res.status(200).json({ message: "Score updated successfully!" });
  });
});

// Endpoint to update the user's lucky symbol
app.post("/updateLuckySymbol", (req, res) => {
  const { id, lucky_symbol } = req.body;

  if (!id || !lucky_symbol) {
    return res.status(400).json({ error: "User ID and lucky symbol are required" });
  }

  const query = "UPDATE user SET lucky_symbol = ? WHERE id = ?";
  pool.query(query, [lucky_symbol, id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to update lucky symbol" });
    }

    res.status(200).json({ message: "Lucky symbol updated successfully!" });
  });
});


// Handle graceful shutdown and close the MySQL connection properly
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  pool.end((err) => {
    if (err) {
      console.error('Error closing MySQL connection:', err);
    }
    process.exit();
  });
});

// Start the server on port 8082
const port = 8082;
app.listen(port, "0.0.0.0", () => {
  console.log("Server running on port 8082");
});
