const express = require("express");
const pool = require("../config/db");
const router = express.Router();

router.post("/question", (req, res) => {
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

router.post("/answer", (req, res) => {
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

module.exports = router;