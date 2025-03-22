// index.js
const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const fs = require('fs');
const pool = require("./config/db");

const envFile = `.env.${process.env.NODE_ENV}`;
let fileToUse;

if (fs.existsSync(envFile)) {
    fileToUse = envFile;
} else if (fs.existsSync('.env')) {
    fileToUse = '.env';
} else {
    throw new Error('No .env file found.');
}

dotenv.config({ path: fileToUse });


const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/health", require("./routes/health"));
app.use("/users", require("./routes/users"));
app.use("/daily", require("./routes/daily"));
app.use("/leaderboard", require("./routes/leaderboard"));

const port = process.env.PORT || 8083;
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});

process.on("SIGINT", () => {
    console.log("Gracefully shutting down...");
    pool.end((err) => {
        if (err) {
            console.error("Error closing MySQL connection:", err);
        }
        process.exit();
    });
});