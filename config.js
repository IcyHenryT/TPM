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
  "uuid" : "",

  //Set up different list price ranges and their corresponding percent off of target price. (The lower value of the range is inclusive, the higher value is exclusive)
  //Example 1: [0,10000000001,95] means that if the list price is between 0 and 10B, it will list at 95% of the target price
  //Example 2: [0,5000000,93,5000000,10000000,96,10000000,10000000001,100] means that if the list price is between 0 and 5M, it will list at 93% of the target price, if the price is between 5M and 10M, it will list at 96% of the target price, and if the price is above 10M and below 10b (10b is AH limit), it will list at 100% of the target price.
  "percentOfTarget": [0,10000000001,95],

  //true or false
  "relist": false,

  //Only claim your auctions (angry coop prevention)
  "ownAuctions": false,

  //Finders to not list. Options: USER, CraftCost, TFM, AI, SNIPER, STONKS, FLIPPER
  "doNotListFinders": [
    "USER"
  ]

}`;

if (!fs.existsSync('./config.json5')) {
  fs.writeFileSync('./config.json5', defaultConfig);
}

function updateConfig(data) {//golden-fleece my savior idk how to spell that
  const newConfig = patch(defaultConfig, data);
  fs.writeFileSync('./config.json5', newConfig, 'utf-8');
}


const config = JSON5.parse(fs.readFileSync('./config.json5', 'utf8'));

module.exports = { config, updateConfig };
