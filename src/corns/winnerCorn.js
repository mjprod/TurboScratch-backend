const cron = require("node-cron");
const { selectWinner } = require("../controller/winnerController");

const startWinnerSelectionCronJob = (dateTime = "59 13 * * 0") => {
    console.log(`Running cron job at ${new Date().toISOString()}`);
    cron.schedule(dateTime, async () => {
        try {
            selectWinner((err, winner) => {
                console.log("Winner Selected: ", winner)
            });

        } catch (error) {
            console.error("Error updating weekly leaderboard snapshot:", error);
        }
    });
};

module.exports = startWinnerSelectionCronJob;
