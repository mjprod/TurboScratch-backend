const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

router.post("/", (req, res) => {
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

module.exports = router;