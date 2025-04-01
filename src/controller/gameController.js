// controllers/gameController.js
const pool = require("../configs/db");

// Function to get the configuration distribution from the 'Config' table
// The 'Config' table should have columns: type (e.g., 'x0', 'x1', 'x2', 'x3', 'x4', 'ls') and value (percentage or value for ls)
function getConfigDistribution(callback) {
  const configQuery = "SELECT type, value FROM Config WHERE type IN ('x0','x1','x2','x3','x4','ls')";
  pool.query(configQuery, (err, results) => {
    if (err) return callback(err);
    let distribution = {};
    results.forEach(row => {
      distribution[row.type] = parseFloat(row.value);
    });
    console.log("Config Distribution:", distribution);
    callback(null, distribution);
  });
}

// Function to calculate how many games should be generated for each category (x0 to x4)
// It uses only the percentages for x0 to x4 (their sum should be 100)
function calculateAssignments(cardsWon, distribution) {
  let assignments = {};
  let totalAssigned = 0;

  ['x0', 'x1', 'x2', 'x3', 'x4'].forEach(cat => {
    assignments[cat] = Math.round(cardsWon * (distribution[cat] / 100));
    totalAssigned += assignments[cat];
  });

  let diff = cardsWon - totalAssigned;
  while (diff > 0) {
    assignments.x3 = (assignments.x3 || 0) + 1;
    diff--;
  }
  while (diff < 0) {
    if (assignments.x3 > 0) {
      assignments.x3--;
      diff++;
    } else {
      break;
    }
  }
  console.log("Calculated Assignments:", assignments);
  return assignments;
}

// Function to transform the assignments object into an array
function getAssignmentArray(assignments) {
  let arr = [];
  for (const rule in assignments) {
    for (let i = 0; i < assignments[rule]; i++) {
      arr.push(rule);
    }
  }
  return arr;
}

// Function to generate theme assignments in blocks (games with the same theme remain together)
function getThemeAssignments(cardsWon) {
  const themeIds = [1, 2, 3, 4];
  // Shuffle the order of themes to vary the blocks
  themeIds.sort(() => Math.random() - 0.5);
  const numThemes = themeIds.length;
  const blockSize = Math.floor(cardsWon / numThemes);
  let assignments = [];

  themeIds.forEach(id => {
    for (let i = 0; i < blockSize; i++) {
      assignments.push(id);
    }
  });

  const remainder = cardsWon - assignments.length;
  for (let i = 0; i < remainder; i++) {
    assignments.push(themeIds[themeIds.length - 1]);
  }

  console.log("Grouped Theme Assignments:", assignments);
  return assignments;
}

// Function to get current lucky symbol info for the user and beta_block
function getCurrentLuckyInfo(user_id, beta_block_id, callback) {
  const query = `
    SELECT 
      COUNT(*) AS game_count,
      SUM(lucky_symbol_won) AS current_lucky_count
    FROM Games
    WHERE user_id = ? AND beta_block_id = ?
    GROUP BY user_id
  `;
  pool.query(query, [user_id, beta_block_id], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) {
      return callback(null, { game_count: 0, current_lucky_count: 0 });
    }
    return callback(null, rows[0]);
  });
}

// Function to decide if the game should receive a lucky symbol based on the index and required difference
// For the first 'diff' games it returns 1, otherwise 0.
function getLuckySymbol(index, diff) {
  return index < diff ? 1 : 0;
}

// Function to create games (cards) for a Daily record
// dailyRecord should contain at least: daily_id, user_id, cards_won, etc.
// beta_block_id is passed separately to ensure it's a valid value.
function createGamesForDaily(user_id, cards_won, beta_block_id, callback) {
  const cardsWon = cards_won;

  getConfigDistribution((err, configDistribution) => {
    if (err) return callback(err);

    // Calculate the assignments for x0 to x4
    const assignments = calculateAssignments(cardsWon, configDistribution);
    // Transform the assignments object into an array and shuffle it
    let assignmentArray = getAssignmentArray(assignments);
    assignmentArray.sort(() => Math.random() - 0.5);
    console.log("Shuffled Assignment Array:", assignmentArray);

    // Get the grouped theme assignments
    const themeAssignments = getThemeAssignments(cardsWon);

    // Before setting the lucky_symbol values for the new games, get the current situation:
    getCurrentLuckyInfo(user_id, beta_block_id, (err, info) => {
      if (err) return callback(err);
      const currentGameCount = info.game_count || 0;
      const currentLucky = info.current_lucky_count || 0;
      // Calculate desired lucky as (total number of games % 50)
      const LS = 50;
      const desiredLucky = currentGameCount % LS;
      // The difference needed in the new games
      const diff = desiredLucky > currentLucky ? desiredLucky - currentLucky : 0;

      console.log("Current game count:", currentGameCount);
      console.log("Desired Lucky Symbol count (game_count % 50):", desiredLucky);
      console.log("Current Lucky Symbol count:", currentLucky);
      console.log("Additional Lucky symbols needed in new games:", diff);

      // Prepare data for insertion into the Games table
      let newGames = [];
      // For the new games, use getLuckySymbol: for the first 'diff' games of the new batch, return 1, then 0.
      for (let i = 0; i < cardsWon; i++) {
        const rule = assignmentArray[i];
        const numCombos = parseInt(rule.substring(1)); // e.g., "x3" → 3
        const lucky = getLuckySymbol(i, diff); // determine 1 or 0 for this game
        const theme = themeAssignments[i];

        newGames.push([
          user_id, // user_id
          beta_block_id,       // beta_block_id (valid value)
          lucky,               // lucky_symbol_won
          numCombos,           // number_combination_total (0 to 4)
          theme,               // theme_id
          false                // played (initially false)
        ]);
      }

      console.log("Insert Games Query:", `
        INSERT INTO Games 
          (user_id, beta_block_id, lucky_symbol_won, number_combination_total, theme_id, played)
        VALUES ?
      `);
      console.log("NewGames array to insert:", newGames);

      pool.query(
        `
        INSERT INTO Games 
          (user_id, beta_block_id, lucky_symbol_won, number_combination_total, theme_id, played)
        VALUES ?
        `,
        [newGames],
        (err, gameResult) => {
          if (err) {
            console.error("Error inserting games:", err);
            return callback(err);
          }
          console.log("Games inserted successfully. Affected rows:", gameResult.affectedRows);
          return callback(null, gameResult);
        }
      );
    });
  });
}

module.exports = { createGamesForDaily };