const migrationFolder = './migrations';
const fs = require("fs");
const dotenv = require("dotenv");

console.log('Starting Migration in', process.env.NODE_ENV);

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

const pool = require("./src/configs/db");

const runMigrations = async () => {
  console.log("Finished Migrations")

  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS Migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (!fs.existsSync(migrationFolder)) {
    fs.mkdirSync(migrationFolder);
  }

  const migrationFiles = fs
    .readdirSync(migrationFolder)
    .filter(file => file.endsWith('.js'));

  for (const file of migrationFiles) {
    const [rows] = await pool.promise().query('SELECT * FROM Migrations WHERE name = ?', [file]);
    if (rows.length === 0) {
      console.log(`Running migration: ${file}`);
      const migration = require(`${migrationFolder}/${file}`);
      await migration.up(pool.promise());
      await pool.promise().query('INSERT INTO Migrations (name) VALUES (?)', [file]);
    } else {
      console.log(`Already ran: ${file}`);
    }
  }
  console.log("Finished Migrations")
  await pool.promise().end();
};

runMigrations().catch((err) => {
  console.log(err)
}) 