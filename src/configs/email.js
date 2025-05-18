const { SESv2Client } = require('@aws-sdk/client-sesv2');

const emailClient = new SESv2Client({
  region: process.env.AWS_REGION, credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

module.exports = emailClient;