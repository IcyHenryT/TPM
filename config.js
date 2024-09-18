const fs = require('fs');
const JSON5 = require('json5');
const { patch } = require('golden-fleece');

const defaultConfig = `{
  // Put username of your account here.
  "username": "",
  
  // Put your discord webhook here. (if u wanna send to multiple places make this an array of webhooks (if you dont know what that means letme introduce you to chat.openai.com))
  "webhook": "",
  
  //true or false
  "bedSpam": false,

  //The time before bed timings clicks 
  "waittime": 15,

  //BAF Websocket, gives no captchas
  "useBafSocket": true,

  //Skip is very fast but higher ban chance
  "useSkip": false,

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

  //Automtically buy new cookie if you start bot with under 24hrs of cookie or if it's about to expire while bot is already running
  "autoCookie": false,

  //Stop buying if daily limit is reached and then resumes when it resets
  "dailyLimit": false,

  //If the flip is more profit than this value skip will be used on the flip. [THIS WILL STILL WORK IF USESKIP IS FALSE SO LEAVE IT A VERY HIGH NUMBER (preset) IF U NEVER WANT TO SKIP]
  "skipProfit": 10000000001,

  //Will use skip if finder is user [WILL STILL WORK IF USESKIP IS FALSE SO SET THIS ACCORDINGLY]
  "skipUser": false,

  //Flip on frend island (i am NOT adding a check for if their island is closed so if youre dumb with this its your fault L bozo) (put frend ign between the quotes and leave as "" for nothing)
  "friendIsland": "",

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
    ],

    //Dont list any item with a skin or any skins
    "skins": true,

    //Doesn't list any flips under your minium profit
    "underMinProfit": true

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
