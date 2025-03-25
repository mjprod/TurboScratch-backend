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
    res.status(200).json(`Received: ${data}`);
});

router.get('/time', (req, res) => {
    const date = new Date();
    const options = {
        timeZone: "Australia/Brisbane",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };

    const australianTime = date.toLocaleString("en-AU", options);
    res.send(`Current Australian Time: ${australianTime}`);
});

module.exports = router;