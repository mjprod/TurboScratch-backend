const pool = require("../configs/db");

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

module.exports = { getUser }