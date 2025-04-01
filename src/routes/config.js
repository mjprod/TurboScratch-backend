const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

// GET endpoint to fetch configuration values for x0, x1, x2, x3, x4, and ls
router.get("/", (req, res) => {
    const query = "SELECT type, value FROM Config WHERE type IN ('x0','x1','x2','x3','x4','ls')";
    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching config:", err);
            return res.status(500).json({ error: err.message });
        }
        let config = {};
        results.forEach(row => {
            config[row.type] = row.value;
        });
        return res.status(200).json(config);
    });
});

// PUT endpoint to update configuration values
router.put("/", (req, res) => {
    const { x0, x1, x2, x3, x4, ls } = req.body;
    if (
        x0 === undefined ||
        x1 === undefined ||
        x2 === undefined ||
        x3 === undefined ||
        x4 === undefined ||
        ls === undefined
    ) {
        return res.status(400).json({ error: "All config parameters (x0, x1, x2, x3, x4, ls) are required." });
    }

    // Build an array of update tasks
    const updates = [
        { type: 'x0', value: x0 },
        { type: 'x1', value: x1 },
        { type: 'x2', value: x2 },
        { type: 'x3', value: x3 },
        { type: 'x4', value: x4 },
        { type: 'ls', value: ls }
    ];

    // For simplicity, we run separate update queries
    let completed = 0;
    updates.forEach(item => {
        const updateQuery = "UPDATE Config SET value = ? WHERE type = ?";
        pool.query(updateQuery, [item.value, item.type], (err, result) => {
            if (err) {
                console.error("Error updating config:", err);
                return res.status(500).json({ error: err.message });
            }
            completed++;
            if (completed === updates.length) {
                return res.status(200).json({ message: "Configuration updated successfully!" });
            }
        });
    });
});

module.exports = router;