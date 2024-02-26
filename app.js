
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken =  process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const chatGPTApiKey = process.env.CHATGPT_API_KEY;
const chatGPTApiEndpoint = 'https://api.openai.com/v1/chat/completions';

const client = new twilio(accountSid, authToken);

app.post('/incoming-sms', async (req, res) => {
  const incomingMessage = req.body.Body;
  const senderPhoneNumber = req.body.From;

  console.log(`Received message from ${senderPhoneNumber}: ${incomingMessage}`);

  // Process incoming message using ChatGPT API
  try {
    const chatGPTResponse = await axios.post(
      chatGPTApiEndpoint,
      { model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: `Respond to this message: ${incomingMessage}`}],
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${chatGPTApiKey}` } }
    );

    const chatGPTReply = chatGPTResponse.data.choices[0].message.content;

    // Send ChatGPT reply via Twilio
    client.messages.create({
      body: chatGPTReply,
      from: twilioPhoneNumber,
      to: senderPhoneNumber
    });

    console.log(`Sent reply to ${senderPhoneNumber}: ${chatGPTReply}`);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing message:', error.message);
    res.sendStatus(500);
  }
});
