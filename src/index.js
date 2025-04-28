const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const startLeaderboardCronJob = require("./corns/leaderboard");
const apiKeyMiddleware = require('./middlewares/authMiddleware');
const cryptoMiddleware = require('./middlewares/cryptoMiddlewear');
const { api_prefix } = require("./utils/constants");

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options("*", cors());

app.use(bodyParser.json());

app.use(cryptoMiddleware);

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