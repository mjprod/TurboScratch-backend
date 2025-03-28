const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const startLeaderboardCronJob = require("./corns/leaderboard");
const apiKeyMiddleware = require('./middlewares/authMiddleware');
const cryptoMiddleware = require('./middlewares/cryptoMiddlewear');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(cryptoMiddleware)

app.get('/', (req, res) => {
    res.send('Hello, you are authorized!');
});


app.use("/health", require("./routes/health"));
app.use("/users", require("./routes/users"));
app.use("/daily", apiKeyMiddleware, require("./routes/daily"));
app.use("/game", apiKeyMiddleware, require("./routes/game"));
app.use("/leaderboard", apiKeyMiddleware, require("./routes/leaderboard"));
app.use("/betablock", apiKeyMiddleware, require("./routes/betablock"));
app.use("/winners", apiKeyMiddleware, require("./routes/winners"));
startLeaderboardCronJob();

module.exports = app;