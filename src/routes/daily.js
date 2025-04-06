const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const { createGamesForDaily } = require("../controller/gameController");

router.post("/question", (req, res) => {
    const { user_id, beta_block_id } = req.body;
    if (!user_id) {
        return res.status(400).json({ error: "user_id and beta_block_id are required" });
    }

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
            "SELECT question FROM Questions WHERE actived=1 AND question_id = ? AND beta_block_id = ?";
        pool.query(questionQuery, [newQuestionId, beta_block_id], (err, questionResults) => {
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

router.post("/answer", (req, res) => {
    const { question_id, answer, user_id, cards_won } = req.body;

    if (!question_id || !answer || !user_id || !cards_won) {
        return res
            .status(400)
            .json({
                error: "question_id, answer, cards_won, and user_id are required",
            });
    }

    // Check if an answer already exists for this beta_block, question and user
    const checkAnswerQuery = `
      SELECT * FROM Answers
      WHERE question_id = ? AND user_id = ?
    `;
    pool.query(checkAnswerQuery, [question_id, user_id, beta_block_id], (err, existingRows) => {
        if (err) {
            console.error("Error checking existing answer:", err);
            return res.status(500).json({ error: err.message });
        }
        if (existingRows.length > 0) {
            return res.status(400).json({ error: "An answer for this beta_block already exists." });
        }

        // 1. Insert the answer into the Answers table
        const insertAnswerQuery = `
            INSERT INTO Answers (answer, question_id, user_id)
            VALUES (?, ?, ?)
        `;
        pool.query(insertAnswerQuery, [answer, question_id, user_id, beta_block_id], (err, answerResult) => {
            if (err) {
                console.error("Error inserting answer:", err);
                return res.status(500).json({ error: err.message });
            }

            // 2. Insert the daily record into the Daily table
            const cards_played = 0;
            const insertDailyQuery = `
                INSERT INTO Daily (user_id, cards_won, cards_played, question_id)
                VALUES (?, ?, ?, ?)
            `;
            pool.query(insertDailyQuery, [user_id, cards_won, cards_played, question_id], (err, dailyResult) => {
                if (err) {
                    console.error("Error inserting daily record:", err);
                    return res.status(500).json({ error: err.message });
                }
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
                    const dailyRecord = dailyRecords[0];

                    // 3. Create the games (cards) using the gameController
                    // The function createGamesForDaily should accept the dailyRecord and return, via callback,
                    // the result of the games insertion.
                    createGamesForDaily(dailyRecord.user_id, dailyRecord.cards_won, beta_block_id, (err, gameResult) => {
                        if (err) {
                            console.error("Error inserting games:", err);
                            return res.status(500).json({ error: err.message });
                        }
                        // 4. Update the user's card balance
                        const updateUserQuery = `
                            UPDATE Users
                            SET card_balance = card_balance + ?
                            WHERE user_id = ?;
                        `;
                        pool.query(updateUserQuery, [cards_won, user_id], (err, updateResult) => {
                            if (err) {
                                console.error("Error updating user balance:", err);
                                return res.status(500).json({ error: err.message });
                            }
                            console.log("User balance updated successfully");
                            return res.status(200).json({
                                message: "Answer, daily record, and games inserted successfully!",
                                answer_id: answerResult.insertId,
                                daily: dailyRecord,
                                insertedGames: gameResult.affectedRows
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;