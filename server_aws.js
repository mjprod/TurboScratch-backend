const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const { decreaseUserCardBalance } = require("./helpers");

const cors = require("cors");
const ticket_milestorne = 20000;

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
  timezone: "Z",
});

// Endpoint de health check do servidor
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy!" });
});

// Endpoint de health check para o banco de dados
app.get("/health/db", (req, res) => {
  pool.query("SELECT 1", (err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Database connection failed", error: err });
    }
    res.status(200).json({ message: "Database is healthy!" });
  });
});

// Endpoint to fetch user details by user_id
// To register a new user, include 'name' and 'email' as query parameters (e.g. /users/1?name=John&email=john@example.com)
app.post("/users", (req, res) => {
  const { user_id, name, email } = req.body;

  // Get current date/time in UTC in the format "YYYY-MM-DD HH:MM:SS"
  const nowUTC = new Date().toISOString().slice(0, 19).replace("T", " ");
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
        pool.query(
          insertQuery,
          [user_id, userName, userEmail],
          (err, insertResult) => {
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
          }
        );
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
            pool.query(
              updateQuery,
              [activeCampaign.beta_block_id, user_id],
              (err, updateResult) => {
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
                  fetchDailyDataAndReturn(
                    updatedUserResults[0],
                    activeCampaign,
                    res
                  );
                });
              }
            );
          } else {
            console.log(
              "current_beta_block is already updated with the active campaign."
            );
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
// Helper function to fetch daily data for the active campaign period,
// grouped by week (relative to the campaign start), and return the response.
// Helper function to fetch daily data for the active campaign period, grouped by week (relative to campaign start),
// and return the response with "current_week" and "days" as an array.
function fetchDailyDataAndReturn(user, activeCampaign, res) {
  // Calculate the total number of weeks in the campaign
  const campaignStart = new Date(activeCampaign.date_time_initial);
  const campaignEnd = new Date(activeCampaign.date_time_final);
  const today = new Date();

  const diffDays = Math.ceil(
    (campaignEnd - campaignStart) / (1000 * 60 * 60 * 24)
  );
  const totalWeeks = Math.ceil(diffDays / 7);

  const daysSinceStart = Math.floor(
    (today - campaignStart) / (1000 * 60 * 60 * 24)
  );
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;

  // Query to group daily records by week relative to the campaign start date.
  // The week is computed as: FLOOR(DATEDIFF(create_at, campaignStart) / 7) + 1.
  const dailyQuery = `
    SELECT 
      FLOOR(DATEDIFF(create_at, ?) / 7) + 1 AS week,
      COUNT(*) AS total_entries,
      GROUP_CONCAT(create_at ORDER BY create_at ASC) AS days
    FROM Daily
    WHERE user_id = ? 
      AND create_at BETWEEN ? AND ?
    GROUP BY week
    ORDER BY week ASC;
  `;

  pool.query(
    dailyQuery,
    [
      activeCampaign.date_time_initial,
      user.user_id,
      activeCampaign.date_time_initial,
      activeCampaign.date_time_final,
    ],
    (err, dailyGroupedResults) => {
      if (err) {
        console.error("Error fetching grouped daily data:", err);
        return res.status(500).json({ error: err.message });
      }

      // Transform each row: rename "week" to "current_week" and split the "days" string into an array.
      const transformedResults = dailyGroupedResults.map((row) => {
        return {
          current_week: row.week,
          total_entries: row.total_entries,
          days: row.days ? row.days.split(",") : [],
        };
      });

      console.log("Daily data grouped by week:", transformedResults);
      return res.status(200).json({
        user,
        daily: transformedResults,
        total_weeks: totalWeeks,
        current_week: currentWeek,
      });
    }
  );
}

// Endpoint para criar um registro na tabela Daily
app.post("/daily_question", (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  // 1. Determine the new question_id for the given user from the Answers table.
  // This query gets the maximum question_id currently stored for that user.
  const selectMaxQuery =
    "SELECT MAX(question_id) AS maxQuestion FROM Answers WHERE user_id = ?";
  pool.query(selectMaxQuery, [user_id], (err, results) => {
    if (err) {
      console.error("Error selecting max question_id:", err);
      return res.status(500).json({ error: err.message });
    }

    let newQuestionId = 1;
    if (results[0].maxQuestion !== null) {
      newQuestionId = results[0].maxQuestion + 1;
    }

    // 2. Retrieve the question text from the Questions table using newQuestionId.
    const questionQuery =
      "SELECT question FROM turbo_scratch.Questions WHERE question_id = ?";
    pool.query(questionQuery, [newQuestionId], (err, questionResults) => {
      if (err) {
        console.error("Error fetching question:", err);
        return res.status(500).json({ error: err.message });
      }
      if (questionResults.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }

      const questionText = questionResults[0].question;

      // 3. Return the question details to the client.
      // The client will display the question, and once the user answers,
      // a separate endpoint will handle the answer insertion.
      return res.status(200).json({
        question_id: newQuestionId,
        question: questionText,
      });
    });
  });
});

app.post("/daily_answer", (req, res) => {
  const { question_id, answer, user_id, cards_won } = req.body;

  // Validate that all required parameters are provided
  if (!question_id || !answer || !user_id || !cards_won) {
    return res
      .status(400)
      .json({ error: "question_id, answer, and user_id are required" });
  }

  // 1. Insert the answer into the Answers table
  const insertAnswerQuery = `
    INSERT INTO Answers (answer, question_id, user_id)
    VALUES (?, ?, ?)
  `;
  pool.query(
    insertAnswerQuery,
    [answer, question_id, user_id],
    (err, answerResult) => {
      if (err) {
        console.error("Error inserting answer:", err);
        return res.status(500).json({ error: err.message });
      }

      // 2. Insert the daily record into the Daily table with fixed values
      const cards_played = 0;
      const insertDailyQuery = `
      INSERT INTO Daily (user_id, cards_won, cards_played, question_id)
      VALUES (?, ?, ?, ?)
    `;
      pool.query(
        insertDailyQuery,
        [user_id, cards_won, cards_played, question_id],
        (err, dailyResult) => {
          if (err) {
            console.error("Error inserting daily record:", err);
            return res.status(500).json({ error: err.message });
          }

          // 3. Retrieve the inserted Daily record
          const dailyId = dailyResult.insertId;
          const selectDailyQuery = "SELECT * FROM Daily WHERE daily_id = ?";
          pool.query(selectDailyQuery, [dailyId], (err, dailyRecords) => {
            if (err) {
              console.error("Error fetching daily record:", err);
              return res.status(500).json({ error: err.message });
            }
            if (dailyRecords.length === 0) {
              return res.status(404).json({ error: "Daily record not found" });
            }
            const updateUserQuery = `
          UPDATE Users
          SET card_balance = card_balance + ?
          WHERE user_id = ?;
        `;
            pool.query(updateUserQuery, [cards_won, user_id], (err, result) => {
              if (err) {
                console.error("Error updating user balance:", err);
                return res.status(500).json({ error: err.message });
              }
              console.log("User balance updated successfully");
              return res.status(200).json({
                message: "Answer and daily record inserted successfully!",
                answer_id: answerResult.insertId,
                daily: dailyRecords[0],
              });
            });
          });
        }
      );
    }
  );
});

// Endpoint para criar um registro na tabela BetaBlock
app.post("/betaBlock", (req, res) => {
  const { beta_block_description, date_time_initial, date_time_final } =
    req.body;
  if (!beta_block_description || !date_time_initial || !date_time_final) {
    return res.status(400).json({
      error:
        "beta_block_description, date_time_initial, and date_time_final are required",
    });
  }
  const query =
    "INSERT INTO BetaBlock (beta_block_description, date_time_initial, date_time_final) VALUES (?, ?, ?)";
  pool.query(
    query,
    [beta_block_description, date_time_initial, date_time_final],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({
        message: "BetaBlock record created successfully!",
        betaBlockId: results.insertId,
      });
    }
  );
});

// Endpoint para criar um registro na tabela Game
app.post("/game", (req, res) => {
  const {
    beta_block_id,
    user_id,
    lucky_symbol_won,
    number_combination_total,
    number_combination_user_played,
  } = req.body;
  if (!beta_block_id || !user_id) {
    return res
      .status(400)
      .json({ error: "beta_block_id and user_id are required" });
  }
  const query = `INSERT INTO Game (beta_block_id, user_id, lucky_symbol_won, number_combination_total, number_combination_user_played)
                 VALUES (?, ?, ?, ?, ?)`;
  pool.query(
    query,
    [
      beta_block_id,
      user_id,
      lucky_symbol_won,
      number_combination_total,
      number_combination_user_played,
    ],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({
        message: "Game record created successfully!",
        gameId: results.insertId,
      });
    }
  );
});

app.post("/leader_board", (req, res) => {
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

app.post("/update_card_played", (req, res) => {
  const { user_id, beta_block_id, lucky_symbol_won, number_combination_total } =
    req.body;

  if (
    !user_id ||
    !beta_block_id ||
    lucky_symbol_won === undefined ||
    lucky_symbol_won === null ||
    number_combination_total === undefined ||
    number_combination_total === null
  ) {
    return res.status(400).json({
      error:
        "user_id, beta_block_id, lucky_symbol_won & number_combination_total are required",
    });
  }
  const betaBlockQuery = `
    SELECT *
    FROM BetaBlock
    WHERE beta_block_id = ?;
  `;
  pool.query(betaBlockQuery, [beta_block_id], (err, betaBlockResult) => {
    if (err) {
      console.error("Error Getting BetaBlock data:", err);
      return res.status(500).json({ error: err.message });
    }
    const createGameQuery = `
      INSERT INTO Game (beta_block_id, user_id, lucky_symbol_won, number_combination_total, number_combination_user_played)
      VALUES (?, ?, ?, ?, 0)
    `;
    pool.query(
      createGameQuery,
      [beta_block_id, user_id, lucky_symbol_won, number_combination_total],
      (err, createGameResult) => {
        if (err) {
          console.error("Error Creating Game:", err);
          return res.status(500).json({ error: err.message });
        }
        const dailyBlockQuery = `
          SELECT *
          FROM Daily
          WHERE user_id = ?
          AND create_at BETWEEN ? AND ? 
          ORDER BY create_at ASC;
        `;
        if (betaBlockQuery.length === 0) {
          return res.status(404).json({ error: "Beta Block not found" });
        }
        pool.query(
          dailyBlockQuery,
          [
            user_id,
            betaBlockResult[0].date_time_initial,
            betaBlockResult[0].date_time_final,
          ],
          (err, dailyBlockResult) => {
            if (err) {
              console.error("Error Getting Daily data:", err);
              return res.status(500).json({ error: err.message });
            }
            if (dailyBlockResult.length === 0) {
              return res.status(404).json({ error: "Daily Data not found" });
            }

            const dailyToDeduct = dailyBlockResult.find(
              (dailyBlockResult) =>
                dailyBlockResult.cards_played < dailyBlockResult.cards_won
            );
            const updateUserScoreQuery = `
              UPDATE Users
              SET card_balance = card_balance - 1
              WHERE user_id = ?;
            `;
            if (!dailyToDeduct) {
              pool.query(updateUserScoreQuery, [user_id], (err, result) => {
                if (err) {
                  console.error("Error Updating User data:", err);
                  return res.status(500).json({ error: err.message });
                }
                return res.status(200).json({
                  message: "Successfully Decreased the Card Balance",
                  gameId: createGameResult.insertId,
                });
              });
            }

            const updateCardsPlayedQuery = `
              UPDATE Daily
              SET cards_played = cards_played + 1
              WHERE user_id = ? AND daily_id = ?;
            `;
            pool.query(
              updateCardsPlayedQuery,
              [user_id, dailyToDeduct.daily_id],
              (err, result) => {
                if (err) {
                  console.error("Error Updating Daily data:", err);
                  return res.status(500).json({ error: err.message });
                }
                pool.query(updateUserScoreQuery, [user_id], (err, result) => {
                  if (err) {
                    console.error("Error Updating User data:", err);
                    return res.status(500).json({ error: err.message });
                  }
                  return res.status(200).json({
                    message: "Successfully Decreased the Card Balance",
                    gameId: createGameResult.insertId,
                  });
                });
              }
            );
          }
        );
      }
    );
  });
});

app.post("/update_score", (req, res) => {
  const { user_id, score, combo_played, game_id } = req.body;
  if (
    !user_id ||
    !score ||
    combo_played === undefined ||
    combo_played === null ||
    !game_id
  ) {
    return res.status(400).json({ error: "user_id & score are required" });
  }
  const ticket_balance = Math.floor(score / ticket_milestorne);
  const updateUserScoreQuery = `
    UPDATE Users
    SET total_score = ?, ticket_balance = ?
    WHERE user_id = ?;
  `;
  const updateComboPlayedQuery = `
    UPDATE Game 
    SET number_combination_user_played = ?
    WHERE game_id = ?
  `;
  pool.query(
    updateComboPlayedQuery,
    [combo_played, game_id],
    (err, result) => {
      if (err) {
        console.error("Error Updating Combo Played data:", err);
      }
    }
  );
  pool.query(
    updateUserScoreQuery,
    [score, ticket_balance, user_id],
    (err, result) => {
      if (err) {
        console.error("Error Updating User data:", err);
        return res.status(500).json({ error: err.message });
      }
      return res.status(200).json({
        ...result,
      });
    }
  );
});

app.post("/update_lucky_symbol", (req, res) => {
  const { user_id, lucky_symbol } = req.body;
  if (!user_id || lucky_symbol === undefined || lucky_symbol === null) {
    console.error("user_id & lucky_symbol are required");
    return res
      .status(400)
      .json({ error: "user_id & lucky_symbol are required" });
  }
  const updateLuckySymbolQuery = `
    UPDATE Users
    SET lucky_symbol_balance = ?
    WHERE user_id = ?;
  `;
  pool.query(updateLuckySymbolQuery, [lucky_symbol, user_id], (err, result) => {
    if (err) {
      console.error("Error Updating User data:", err);
      return res.status(500).json({ error: err.message });
    }
    return res.status(200).json({
      ...result,
    });
  });
});

// Fechamento gracioso da aplicação e conexão com o banco
process.on("SIGINT", () => {
  console.log("Gracefully shutting down...");
  pool.end((err) => {
    if (err) {
      console.error("Error closing MySQL connection:", err);
    }
    process.exit();
  });
});

// Inicia o servidor na porta 8083
const port = 8083;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
