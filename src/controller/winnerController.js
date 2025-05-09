const pool = require("../configs/db");
const { getCurrentWeek } = require("../utils/datetime");
const { getCurrentActiveBetaBlock } = require("./betaBlockController");

async function checkWinner(beta_block_id, currentWeek, callback) {
    const checkWinnerQuery = `
        SELECT * FROM Winners
        WHERE beta_block_id = ? AND week_number = ?
        LIMIT 1
    `;
    try {
        const [winnerResults] = await pool.promise().query(checkWinnerQuery, [beta_block_id, currentWeek])
        if (winnerResults.length) {
            console.log("WinnerFound", winnerResults[0]);
            return callback(null, winnerResults[0]);
        } else {
            return callback(null, null);
        }
    } catch (err) {
        console.error("Error checking winner:", err);
        return callback(err, null);
    }
};

async function getWinner(callback) {
    getCurrentActiveBetaBlock((err, activeCampain) => {
        if (err) return callback(err, null)
        if (activeCampain) {
            const currentWeek = getCurrentWeek(activeCampain.date_time_initial)
            checkWinner(activeCampain.beta_block_id, currentWeek, async (err, winner) => {
                return callback(err, winner)
            })
        }
    })
}

async function selectWinner(callback) {
    getCurrentActiveBetaBlock((err, activeCampain) => {
        if (err) return callback(err)
        if (activeCampain) {
            const currentWeek = getCurrentWeek(activeCampain.date_time_initial)
            checkWinner(activeCampain.beta_block_id, currentWeek, async (err, winner) => {
                if (err) return callback(err);
                if (!winner) {
                    const userQuery = `SELECT *
                    FROM (
                    SELECT u.*
                    FROM Users u
                    JOIN (
                        SELECT units.n + tens.n + hundreds.n AS n
                        FROM 
                        (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) units,
                        (SELECT 0 AS n UNION ALL SELECT 10 UNION ALL SELECT 20 UNION ALL SELECT 30 UNION ALL SELECT 40
                        UNION ALL SELECT 50 UNION ALL SELECT 60 UNION ALL SELECT 70 UNION ALL SELECT 80 UNION ALL SELECT 90) tens,
                        (SELECT 0 AS n UNION ALL SELECT 100 UNION ALL SELECT 200 UNION ALL SELECT 300 UNION ALL SELECT 400
                        UNION ALL SELECT 500 UNION ALL SELECT 600 UNION ALL SELECT 700 UNION ALL SELECT 800 UNION ALL SELECT 900) hundreds
                    ) nums
                    ON nums.n < u.ticket_balance
                    ) expanded
                    ORDER BY RAND()
                    LIMIT 1;`;

                    const [newWinnerRows] = await pool.promise().query(userQuery);
                    const newWinner = newWinnerRows[0];

                    const [newWinnerInsertResult] = await pool.promise().query(`
                      INSERT INTO Winners (user_id, beta_block_id, week_number)
                      VALUES (?, ?, ?)
                    `,
                        [
                            newWinner.user_id,
                            activeCampain.beta_block_id,
                            currentWeek
                        ]
                    );
                    console.log("New Winner Selected:", newWinnerInsertResult);
                    return callback(null, newWinnerInsertResult)
                } else {
                    console.log("Winner Already Selected:", winner);
                    return callback(null, winner)
                }
            })
        }
    })
}
module.exports = { selectWinner, getWinner }  