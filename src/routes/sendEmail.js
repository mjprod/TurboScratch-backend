const express = require('express');
const router = express.Router();
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const client = new SESv2Client({ region: 'ap-southeast-2' });

router.post('/', async (req, res) => {
  const { name, email } = req.body;

  const params = {
    FromEmailAddress: 'turboscratch@luckygamez.click',
    Destination: {
      ToAddresses: [email]
    },
    Content: {
      Template: {
        TemplateName: 'TurboScratchWinner',
        TemplateData: JSON.stringify({ name })
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await client.send(command);
    console.log('Email sent successfully! Message ID:', response.MessageId);

    res.status(200).json({
      message: 'Email sent successfully',
      messageId: response.MessageId
    });

  } catch (error) {
    console.error('Error sending email:', error);

    res.status(500).json({
      message: 'Failed to send email',
      error: error.message
    });
  }
});

module.exports = router;
