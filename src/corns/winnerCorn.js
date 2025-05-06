const cron = require("node-cron");
const { selectWinner } = require("../controller/winnerController");

const startWinnerSelectionCronJob = (dateTime = "59 13 * * 0") => {
    console.log(`Running cron job at ${new Date().toISOString()}`);
    cron.schedule(dateTime, async () => {
        selectWinner((err, winner) => {
            if (err) {
                return console.err(err)
            }
            console.log("Winner Selected: ", winner)
        });
    });
};

module.exports = startWinnerSelectionCronJob;
