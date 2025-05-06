const fs = require("fs");
const dotenv = require("dotenv");

console.log('Starting server in', process.env.NODE_ENV);

const envFile = `.env.${process.env.NODE_ENV}`;

let fileToUse;
if (fs.existsSync(envFile)) {
    fileToUse = envFile;
} else if (fs.existsSync('.env')) {
    fileToUse = '.env';
} else {
    throw new Error('No .env file found.');
}

console.log('Loading environment variables from:', fileToUse);;
dotenv.config({ path: fileToUse });

const startLeaderboardCronJob = require('../corns/leaderboard');

startLeaderboardCronJob("* * * * *");
console.log('Cron job started. Waiting for the scheduled time...');