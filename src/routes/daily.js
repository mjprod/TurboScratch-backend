const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const { createGamesForDaily } = require("../controller/gameController");

router.post("/question", (req, res) => {
    const { user_id, beta_block_id } = req.body;
    if (!user_id || !beta_block_id) {
        return res.status(400).json({ error: "user_id and beta_block_id are required" });
    }

    const selectMaxQuery = "SELECT MAX(question_id) AS maxQuestion FROM Answers WHERE user_id = ? AND beta_block_id=?";

    pool.query(selectMaxQuery, [user_id, beta_block_id], (err, results) => {
        if (err) {
            console.error("Error selecting max question_id:", err);
            return res.status(500).json({ error: err.message });
        }

        let newQuestionId = 1;
        if (results[0].maxQuestion !== null) {
            newQuestionId = results[0].maxQuestion + 1;
        }

        const questionQuery = "SELECT question, question_id FROM Questions WHERE beta_block_id = ? AND actived=1 AND question_id >= ? ORDER BY question_id ASC LIMIT 1";
        pool.query(questionQuery, [beta_block_id, newQuestionId], (err, questionResults) => {
            if (err) {
                console.error("Error fetching question:", err);
                return res.status(500).json({ error: err.message });
            }
            if (questionResults.length === 0) {
                return res.status(404).json({ error: "Question not found" });
            }

            return res.status(200).json({
                question_id: questionResults[0].question_id,
                question: questionResults[0].question,
            });
        });
    });
});

router.post("/answer", (req, res) => {
    const { question_id, answer, user_id, cards_won, beta_block_id } = req.body;
    console.log(req.body);
    if (!question_id || !answer || !user_id || !cards_won || !beta_block_id) {
        return res
            .status(400)
            .json({
                error: "question_id, answer, cards_won, and user_id are required",
            });
    }

    const checkAnswerQuery = `
      SELECT * FROM Answers
      WHERE question_id = ? AND user_id = ? AND beta_block_id = ?
    `;
    pool.query(checkAnswerQuery, [question_id, user_id, beta_block_id], (err, existingRows) => {
        if (err) {
            console.error("Error checking existing answer:", err);
            return res.status(500).json({ error: err.message });
        }
        if (existingRows.length > 0) {
            return res.status(400).json({ error: "An answer for this beta_block already exists." });
        }

        const insertAnswerQuery = `
            INSERT INTO Answers (answer, question_id, user_id, beta_block_id)
            VALUES (?, ?, ?, ?)
        `;
        pool.query(insertAnswerQuery, [answer, question_id, user_id, beta_block_id], (err, answerResult) => {
            if (err) {
                console.error("Error inserting answer:", err);
                return res.status(500).json({ error: err.message });
            }

            const cards_played = 0;
            const insertDailyQuery = `
                INSERT INTO Daily (user_id, cards_won, cards_played, question_id, beta_block_id)
                VALUES (?, ?, ?, ?, ?)
            `;
            pool.query(insertDailyQuery, [user_id, cards_won, cards_played, question_id, beta_block_id], (err, dailyResult) => {
                if (err) {
                    console.error("Error inserting daily record:", err);
                    return res.status(500).json({ error: err.message });
                }
                const dailyId = dailyResult.insertId;
                const selectDailyQuery = "SELECT * FROM Daily WHERE daily_id = ? AND beta_block_id = ?";

                pool.query(selectDailyQuery, [dailyId, beta_block_id], (err, dailyRecords) => {
                    console.log("Daily Records", dailyRecords)
                    if (err) {
                        console.error("Error fetching daily record:", err);
                        return res.status(500).json({ error: err.message });
                    }
                    if (dailyRecords.length === 0) {
                        return res.status(404).json({ error: "Daily record not found" });
                    }
                    const dailyRecord = dailyRecords[0];

                    createGamesForDaily(dailyRecord.user_id, dailyRecord.cards_won, beta_block_id, (err, gameResult) => {
                        if (err) {
                            console.error("Error inserting games:", err);
                            return res.status(500).json({ error: err.message });
                        }
                        const updateUserQuery = `
                            UPDATE Users
                            SET card_balance = (SELECT count(*) FROM Games WHERE user_id = ? and played = 0 and beta_block_id = ?)
                            WHERE user_id = ?;
                        `;
                        pool.query(updateUserQuery, [user_id, beta_block_id, user_id], (err, updateResult) => {
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