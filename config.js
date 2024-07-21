const fs = require('fs');
const JSON5 = require('json5');
const { patch } = require('golden-fleece');

const defaultConfig = `{
  // Put username of your account here.
  "username": "",
  
  // Put your discord webhook here.
  "webhook": "",
  
  //True or false
  "bedSpam": false,

  //The time before bed timings clicks 
  "waittime": 15,

  //BAF Websocket, gives no captchas but you get more delay
  "useBafSocket": true,

  //Requires prem+
  "usInstance": true,

  //Delay between bed spam clicking (ideally use 100-125) DOES NOTHING WITHOUT BED SPAM ENABLED
  "clickDelay": 125,

  //Delay between opening flips
  "delay": 250,

  //Currently doesn't do anything
  "dicordBotToken": "",

  //Pings on captcha
  "discordID": "",

  // don't touch everything below
  "session": "",

  // terms of service
  "TOS": "",

  //Account UUID
  "uuid" : ""
}`;

if (!fs.existsSync('./config.json5')) {
  fs.writeFileSync('./config.json5', defaultConfig);
}

function updateConfig(data) {//golden-fleece my savior idk how to spell that
  const newConfig = patch(defaultConfig, data);
  fs.writeFileSync('./config.json5', newConfig, 'utf-8');
}


const config = JSON5.parse(fs.readFileSync('./config.json5', 'utf8'));

module.exports = {config, updateConfig};
