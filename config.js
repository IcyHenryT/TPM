const fs = require('fs');
const JSON5 = require('json5');
const { patch } = require('golden-fleece');

const defaultConfig = `{
  // Put username of your account here.
  "username": "",
  
  // Put your discord webhook here.
  "webhook": "",
  
  //true or false
  "bedSpam": false,

  //The time before bed timings clicks 
  "waittime": 15,

  //BAF Websocket, gives no captchas
  "useBafSocket": true,

  //Requires prem+
  "usInstance": true,

  //Delay between bed spam clicking (ideally use 100-125)
  "clickDelay": 125,

  //Delay between opening flips
  "delay": 250,

  //Pings on captcha and required for backend
  "discordID": "",

  // terms of service - auto fills
  "TOS": "",

  //Account UUID - auto fills
  "uuid" : "",

  //Set up different list price ranges and their corresponding percent off of target price. (The lower value of the range is inclusive, the higher value is exclusive)
  //Example 1: [0,10000000001,95] means that if the list price is between 0 and 10B, it will list at 95% of the target price
  //Example 2: [0,5000000,93,5000000,10000000,96,10000000,100] means that if the list price is between 0 and 5M, it will list at 93% of the target price, if the price is between 5M and 10M, it will list at 96% of the target price, and if the price is above 10M, it will list at 100% of the target price.
  "percentOfTarget": [0,10000000001,97],

  //true or false
  "relist": false,

  //Only claim your auctions (angry coop prevention)
  "ownAuctions": false,

  "doNotList":{

    //Finders to not list. Options: USER, CraftCost, TFM, AI, SNIPER, STONKS, FLIPPER
    "finders": [
      "USER"
    ],

    //Don't list if profit is over x
    "profitOver": "50m",

    //Don't list certain item tags
    "itemTags": [
      "HYPERION"
    ]

  },
  //Doesn't send your flips to /get_global_stats. Come on man I made a free macro and you can't even give me some data :( it's nothing like private
  "keepEverythingPrivate": false,

  // DON'T SHARE THIS IT'S YOUR COFL ACCOUNT PASSWORD. If you can't see the cofl link set this to "session": "",
  "session": ""

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
