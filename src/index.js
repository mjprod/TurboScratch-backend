const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const startLeaderboardCronJob = require("./corns/leaderboard");
const apiKeyMiddleware = require('./middlewares/authMiddleware');
const cryptoMiddleware = require('./middlewares/cryptoMiddlewear');
const { api_prefix } = require("./utils/constants");

const app = express();

app.use(cors({
    origin: 'https://feature-staging.d1izslsso66vbm.amplifyapp.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

app.use(cryptoMiddleware)

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello, you are authorized!');
});

router.use('/health', require('./routes/health'));
router.use('/users', require('./routes/users'));
router.use('/daily', apiKeyMiddleware, require('./routes/daily'));
router.use('/game', apiKeyMiddleware, require('./routes/game'));
router.use('/leaderboard', apiKeyMiddleware, require('./routes/leaderboard'));
router.use('/betablocks', require('./routes/betablocks'));
router.use('/winners', apiKeyMiddleware, require('./routes/winners'));
router.use('/login', require('./routes/login'));
router.use('/config', require('./routes/config'));
router.use('/questions', require('./routes/questions'));

app.use(api_prefix, router);

startLeaderboardCronJob();

module.exports = app;