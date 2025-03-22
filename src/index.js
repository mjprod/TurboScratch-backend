const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const startLeaderboardCronJob = require("./corns/leaderboard");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/health", require("./routes/health"));
app.use("/users", require("./routes/users"));
app.use("/daily", require("./routes/daily"));
app.use("/leaderboard", require("./routes/leaderboard"));

startLeaderboardCronJob();

module.exports = app;