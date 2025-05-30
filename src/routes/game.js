const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const { ticket_milestorne } = require("../utils/constants");
const { createGamesForDaily } = require("../controller/gameController");
const { getCurrentActiveBetaBlock } = require("../controller/betaBlockController");
const { getCurrentWeek } = require("../utils/datetime");

router.post("/", (req, res) => {
    const { beta_block_id, user_id } = req.body;
    if (!beta_block_id || !user_id) {
        return res
            .status(400)
            .json({ error: "beta_block_id and user_id are required" });
    }
    getCurrentActiveBetaBlock((err, activeCampain) => {
        if (err) return callback(err)
        const currentWeek = getCurrentWeek(activeCampain.date_time_initial)
        const query = `SELECT * FROM turbo_scratch.Games WHERE user_id = ? AND beta_block_id=? AND played=0 AND week=? LIMIT 12;`;
        pool.query(query, [user_id, beta_block_id, currentWeek], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.status(200).json({
                games: results,
            });
        });
    })
});

router.post("/update_card_played", (req, res) => {
    const { beta_block_id, game_id, user_id } = req.body;

    if (!user_id || !game_id || !beta_block_id) {
        return res.status(400).json({
            error: "game_id and beta_block_id are required required",
        });
    }

    const updateCardPlayedQuery = `UPDATE Games SET played = 1 WHERE game_id = ?`;
    pool.query(updateCardPlayedQuery, [game_id], (err, updateResult) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: err.message });
        }
        const betaBlockQuery = `
            SELECT *
            FROM BetaBlocks
            WHERE beta_block_id = ?;
        `;
        pool.query(betaBlockQuery, [beta_block_id], (err, betaBlockResult) => {
            if (err) {
                console.error("Error Getting BetaBlocks data:", err);
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
                                message: "Successfully Updated Card Balance Played",
                            });
                        });
                    } else {
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
                                        message: "Successfully Updated Card Balance Played",
                                    });
                                });
                            }
                        );
                    }
                }
            );
        });
    });
});

router.post("/update_score", (req, res) => {
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
      UPDATE Games 
      SET number_combination_user_played = ?
      WHERE game_id = ?
    `;
    pool.query(updateComboPlayedQuery, [combo_played, game_id], (err, result) => {
        if (err) {
            console.error("Error Updating Combo Played data:", err);
        }
    });
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

router.post("/update_lucky_symbol", (req, res) => {
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

router.post("/update_card_balance", (req, res) => {
    const { user_id, beta_block_id, increase_card_balance } = req.body;
    if (
        !user_id ||
        !beta_block_id ||
        increase_card_balance === undefined ||
        increase_card_balance === null
    ) {
        console.error("user_id & card_balance are required");
        return res
            .status(400)
            .json({ error: "user_id & card_balance are required" });
    }

    console.log("BetaBlockId", beta_block_id)

    createGamesForDaily(user_id, increase_card_balance, beta_block_id, (err, gameResult) => {
        if (err) {
            console.error("Error inserting games:", err);
            return res.status(500).json({ error: err.message });
        }
        getCurrentActiveBetaBlock((err, activeCampaign) => {
            const currentWeek = getCurrentWeek(activeCampaign.date_time_initial)
            if (err) {
                console.error("Error getting current week:", err);
                return res.status(500).json({ error: err.message });
            }
            const updateUserQuery = `
                UPDATE Users
                SET card_balance = (SELECT count(*) FROM Games WHERE user_id = ? and played = 0 and beta_block_id = ? and week = ?)
                WHERE user_id = ?;
            `;
            console.log("CardBalance Update Query", updateUserQuery);
            pool.query(
                updateUserQuery,
                [user_id, beta_block_id, currentWeek, user_id],
                (err, result) => {
                    if (err) {
                        console.error("Error Updating User data:", err);
                        return res.status(500).json({ error: err.message });
                    }
                    return res.status(200).json({
                        ...result,
                        insertedGames: gameResult.affectedRows
                    });
                }
            );
        });
    });
});

module.exports = router;
