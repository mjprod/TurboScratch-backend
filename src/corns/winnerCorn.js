const cron = require("node-cron");
const { selectWinner } = require("../controller/winnerController");
const { SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { getUser, resetUsersScores } = require("../controller/userController");
const emailClient = require("../configs/email");


const startWinnerSelectionCronJob = (dateTime = "59 13 * * 0") => {
    cron.schedule(dateTime, async () => {
        console.log(`Running cron job at ${new Date().toISOString()}`);
        selectWinner(async (err, winner) => {
            if (err) {
                return console.err(err)
            }

            console.log("Resetting User Data:")
            resetUsersScores((err, result) => {
                if (err) return console.log("Couldn't reset user data.")
                console.log("User Data is now reset:", result)
            });

            console.log("Winner Selected: ", winner)
            getUser(winner.user_id, async (err, user) => {
                const params = {
                    FromEmailAddress: 'turboscratch@luckygamez.click',
                    Destination: {
                        ToAddresses: ["shirish.mjpro@gmail.com", "glauco.mjpro@gmail.com"]
                    },
                    Content: {
                        Template: {
                            TemplateName: 'TurboScratchWinner',
                            TemplateData: JSON.stringify({ name: user.name })
                        }
                    }
                };

                try {
                    const command = new SendEmailCommand(params);
                    const response = await emailClient.send(command);
                    console.log('Email sent successfully! Message ID:', response.MessageId);
                } catch (error) {
                    console.error('Error sending email:', error);
                }
            });
        });
    });
};

module.exports = startWinnerSelectionCronJob;
