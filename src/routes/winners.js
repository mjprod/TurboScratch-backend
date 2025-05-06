const express = require("express");
const pool = require("../configs/db");
const { getWinner } = require("../controller/winnerController");
const router = express.Router();

router.get("/", (req, res) => {
    getWinner((err, winner) => {
        if (err) {
            return console.error(err);
        }
        return res.status(201).json({
            "user": winner,
        });
    });
});

module.exports = router;