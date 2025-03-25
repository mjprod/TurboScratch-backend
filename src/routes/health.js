const express = require("express");
const pool = require("../configs/db");
const router = express.Router();
const crypto = require("../utils/crypto");

router.get("/", (req, res) => {
    res.status(200).json({ message: "Server is healthy!" });
});

router.get("/db", (req, res) => {
    pool.query("SELECT 1", (err) => {
        if (err) {
            return res.status(500).json({ message: "Database connection failed", error: err });
        }
        res.status(200).json({ message: "Database is healthy!" });
    });
});

router.post("/echo", (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ error: "Message is required" });
    }
    res.status(200).json(`Received: ${data}` );
});

module.exports = router;