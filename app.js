var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var twilio = require('twilio');
var http = require('http');
var bodyParser = require('body-parser');
var axios = require('axios');

// Load configuration information from system environment variables.
var TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
var TWILIO_AUTH_TOKEN =  process.env.TWILIO_AUTH_TOKEN;
var TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
var chatGPTApiKey = process.env.CHATGPT_API_KEY;
var chatGPTApiEndpoint = 'https://api.openai.com/v1/chat/completions';

// Create an authenticated client to access the Twilio REST API
var client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// render our home page
app.get('/', function(req, res, next) {
  res.render('index');
});

// handle a POST request to send a text message. 
// This is sent via ajax on our home page
app.post('/message', function(req, res, next) {
  // Use the REST client to send a text message
  client.messages.create({
    to: req.body.to,
    from: TWILIO_PHONE_NUMBER,
    body: 'Good luck on your Twilio quest!'
  }).then(function(message) {
    // When we get a response from Twilio, respond to the HTTP POST request
    res.send('Message is inbound!');
  });
});


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
      from: TWILIO_PHONE_NUMBER,
      to: senderPhoneNumber
    });

    console.log(`Sent reply to ${senderPhoneNumber}: ${chatGPTReply}`);

    res.set('Content-Type','text/xml');
    res.send("<Response></Response>");
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing message:', error.message);
    res.sendStatus(500);
  }
});

// handle a POST request to make an outbound call.
// This is sent via ajax on our home page
app.post('/call', function(req, res, next) {
  // Use the REST client to send a text message
  client.calls.create({
    to: req.body.to,
    from: TWILIO_PHONE_NUMBER,
    url: 'http://demo.twilio.com/docs/voice.xml'
  }).then(function(message) {
    // When we get a response from Twilio, respond to the HTTP POST request
    res.send('Call incoming!');
  });
});

// Create a TwiML document to provide instructions for an outbound call
app.post('/hello', function(req, res, next) {
  // Create a TwiML generator
  var twiml = new twilio.twiml.VoiceResponse();
  // var twiml = new twilio.TwimlResponse();
  twiml.say('Hello there! You have successfully configured a web hook.');
  twiml.say('Good luck on your Twilio quest!', { 
      voice:'woman' 
  });

  // Return an XML response to this request
  res.set('Content-Type','text/xml');
  res.send(twiml.toString());
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
