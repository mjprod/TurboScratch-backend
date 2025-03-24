const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

// Endpoint to fetch user details by user_id
// To register a new user, include 'name' and 'email' as query parameters (e.g. /users/1?name=John&email=john@example.com)
router.post("/", (req, res) => {
    const { user_id, name, email } = req.body;
    if (!user_id || !name || !email) {
        return res
            .status(400)
            .json({ error: "beta_block_id and user_id are required" });
    }
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

module.exports = router;