const pool = require("../configs/db");
const { getCurrentActiveBetaBlock } = require("./betaBlockController");

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

function getRandomInt(min, max) {
  // Ensure the min and max are integers.
  min = Math.ceil(min);
  max = Math.floor(max);
  // Generate a random number between min (inclusive) and max (inclusive)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function createGamesForDaily(user_id, cards_won, beta_block_id, callback) {
  const cardsWon = cards_won;
  getCurrentActiveBetaBlock((err, activeCampaign) => {
    if (err) return callback(err)
    const campaignStart = new Date(activeCampaign.date_time_initial);
    const today = new Date();

    const daysSinceStart = Math.floor(
      (today - campaignStart) / (1000 * 60 * 60 * 24)
    );

    const currentWeek = Math.floor(daysSinceStart / 7) + 1;

    getConfigDistribution((err, configDistribution) => {
      if (err) return callback(err);
      const assignments = calculateAssignments(cardsWon, configDistribution);
      let assignmentArray = getAssignmentArray(assignments);
      assignmentArray.sort(() => Math.random() - 0.5);
      console.log("Shuffled Assignment Array:", assignmentArray);

      const themeAssignments = getThemeAssignments(cardsWon);

      getCurrentLuckyInfo(user_id, beta_block_id, (err, info) => {
        if (err) return callback(err);
        const currentGameCount = info.game_count || 0;
        const currentLucky = info.current_lucky_count || 0;
        const LS = configDistribution.ls;
        const desiredLucky = parseInt(currentGameCount / LS, 10);
        const diff = desiredLucky > currentLucky ? 1 : 0;

        let newGames = [];
        let luckySymbolIndex = getRandomInt(0, cardsWon - 1)

        for (let i = 0; i < cardsWon; i++) {
          const rule = assignmentArray[i];
          const numCombos = parseInt(rule.substring(1));
          const lucky = luckySymbolIndex === i ? diff : 0;
          const theme = themeAssignments[i];

          newGames.push([
            user_id,
            beta_block_id,
            lucky,
            numCombos,
            theme,
            false,
            currentWeek
          ]);
        }

        console.log("Insert Games Query:", `
            INSERT INTO Games 
              (user_id, beta_block_id, lucky_symbol_won, number_combination_total, theme_id, played, week)
            VALUES ?
          `);
        console.log("NewGames array to insert:", newGames);

        pool.query(
          `
            INSERT INTO Games 
              (user_id, beta_block_id, lucky_symbol_won, number_combination_total, theme_id, played, week)
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
  })
}

module.exports = { createGamesForDaily };