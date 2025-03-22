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

const pool = require("./src/config/db");
const app = require("./src/index");

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