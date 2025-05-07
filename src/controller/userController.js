const pool = require("../configs/db");
const { getCurrentActiveBetaBlock } = require("./betaBlockController");

async function getUser(user_id, callback) {
    const checkWinnerQuery = `
        SELECT * FROM Users
        WHERE user_id = ?
        LIMIT 1
    `;
    try {
        const [userResults] = await pool.promise().query(checkWinnerQuery, [user_id])
        if (userResults.length) {
            console.log("User Found", userResults[0]);
            return callback(null, userResults[0]);
        } else {
            return callback(null, null);
        }
    } catch (err) {
        console.error("Error getting user:", err);
        return callback(err, null);
    }
};

async function resetUsersScores(callback) {
    getCurrentActiveBetaBlock(async (err, activeCampain) => {
        if (err) return console.log(err);
        const resetQuery = `
        UPDATE Users
        SET total_score = 0,
            ticket_balance = 0,
            card_balance = 0
        WHERE current_beta_block = ?
    `;
        try {
            const [result] = await pool.promise().query(resetQuery, [activeCampain.beta_block_id]);
            console.log("Users scores reset for beta_block_id", activeCampain.beta_block_id);
            return callback(null, result);
        } catch (err) {
            console.error("Error resetting user score:", err);
            return callback(err, null);
        }
    });

}

module.exports = { getUser, resetUsersScores }