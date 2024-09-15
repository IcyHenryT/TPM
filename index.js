const mineflayer = require('mineflayer');
const readline = require('readline');
const process = require('process');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const utils = require(`./utils.js`);
const { randomUUID } = require('crypto');
const axios = require('axios');
const stateManger = require(`./state.js`);
const { noColorCodes, sendDiscord, nicerFinders, normalizeDate, TheBig3, getCookiePrice, IHATETAXES, randomWardenDye, formatNumber, sleep, getWindowName, getPurse, relistCheck, addCommasToNumber, betterOnce, normalNumber, sendPingStats, omgCookie, checkVersion, visitFrend } = require('./utils.js');
const { MessageBuilder } = require('discord-webhook-node');
const { getPackets, makePackets } = require('./packetStuff.js');
const { silly, debug, error, info, logmc } = require('./logger.js');
var prompt = require('prompt-sync')();
const { startWS, send, handleCommand, ws, sidListener, solveCaptcha, version: botVersion } = require('./websocketHelper.js');
let lastAction = Date.now();
const { config, updateConfig } = require('./config.js');
const nbt = require('prismarine-nbt');
const { sendFlip, giveTheFunStuff, updateSold, sendFlipFound } = require('./tpmWebsocket.js');

let ign, bedSpam, discordid, TOS, webhook, usInstance, clickDelay, delay, usingBaf, session, /*discordbot,*/ badFinders, waittime, doNotList, useSkip, showBed, privacy, autoCookie, dailyLimit, skipProfit, skipUser, friendIsland;

function testign() {
  if (config.username.trim() === '') {
    ign = prompt(`What's your IGN (caps matter): `);
    if (ign) {
      config.username = ign;
      updateConfig(config);
      testDiscordIgn();
    } else {
      logmc(`§cSo close! You need to have an actual ign`);
      testign();
    }
  }
}


function testServer() {
  const userInput = prompt('Use the US Instance? It requires prem+ (y / n): ');
  if (userInput.trim().toLowerCase() === 'y') {
    usInstance = true;
  } else if (userInput.trim().toLowerCase() === 'n') {
    usInstance = false;
  } else {
    logmc(`§cSo close! Type y or n`);
    testServer();
    return;
  }
  config.usInstance = usInstance;
  updateConfig(config)
  testign();
}

function testDiscordIgn() {
  const userInput = prompt('What is your Discord ID (use TPM bot to find out): ');
  if (!userInput || isNaN(parseInt(userInput))) {
    logmc(`§cThat is not a valid discord ID`);
    testDiscordIgn();
    console.log(userInput);
    return;
  }
  config.discordID = userInput;
  testWebhook()
  updateConfig(config)
}

function testWebhook(ranAlready = false) {
  const promptMessage = ranAlready ? 'What is your Discord Webhook (If you don\'t want one then type none but you can\'t use backend):' : 'What is your Discord Webhook: '
  const userInput = prompt(promptMessage);
  if ((!userInput || !userInput?.includes('https')) && !userInput?.includes('none')) {
    logmc(`§cThat is not a valid discord webhook`);
    testWebhook(true);
    console.log(userInput);
    return;
  } else if (userInput.includes('none')) {
    config.webhook = false;
  } else {
    config.webhook = userInput;
  }
  updateConfig(config)
}

if (config.TOS.trim() === '') {
  prompt("BY CLICKING ENTER YOU AGREE THAT IT'S NOT ICYHENRYT'S FAULT IF YOU'RE BANNED BECAUSE IT'S IN BETA");
  config.TOS = 'Accepted';
  updateConfig(config)
  testServer();
}

friendIsland = config.friendIsland;
doNotList = config.doNotList;
ign = config.username;
webhook = config.webhook;
TOS = config.TOS;
session = config.session;
bedSpam = config.bedSpam;
discordid = config.discordID;
//discordbot = config.discordBotToken;
useSkip = config.useSkip;
delay = useSkip ? config.delay + 150 : config.delay;
clickDelay = config.clickDelay;
waittime = config.waittime;
usingBaf = config.useBafSocket;
usInstance = config.usInstance;
percentOfTarget = config.percentOfTarget;
relist = config.relist;
ownAuctions = config.ownAuctions;
showBed = config.showBed || false;
badFinders = doNotList?.finders ? doNotList?.finders : ['USER'];
dontListProfitOver = normalNumber(doNotList?.profitOver) ? normalNumber(doNotList?.profitOver) : 50_000_000;
dontListItems = doNotList?.itemTags ? doNotList?.itemTags : ['HYPERION'];
dontListSkins = doNotList?.skins || true;
privacy = config.keepEverythingPrivate;
autoCookie = config.autoCookie;
dailyLimit = config.dailyLimit;
skipProfit = config.skipProfit;
skipUser = config.skipUser;

let ping = "";
if (discordid) ping = `<@${discordid}>`;
let lastSentCookie = 0;

webhookPricing = {};

let privacySettings;

let targetQueue = [];
let idQueue = [];
let finderQueue = [];
let purchasedIds = [];
let purchasedTargets = [];
let purchasedFinders = [];
let lastOpenedAhids = [];
let lastOpenedTargets = [];
let lastOpenedFinders = [];
let lastListedIds = [];
let lastListedTargets = [];
let relistObject = {};
let ranit = false;
let totalslots = 17;
let currentlisted = 0;
let closedGui = false;
let bedFailed = false;
let bot;
let cdClaim = 0;
let quickProfit;
let quickFinder;
let fullInv = false;
let relistClaim = false;
let uuidFound = false;
let lastLeftBuying = Date.now();
let waitting;
let boughtItems = 0, soldItems = 0;
let lastRelistCheck = Date.now();
let packets;
let buyspeed, confirmAt, oldConfirmAt;
let useSkipOnFlip = false;
let recentlySkipped = false;
let recentPurse = false;
let lastID = null;
let lastIDTime = Date.now();
let lastCrated = Date.now() + 50000;
let happened = false;

function betterClick(slot, mode1 = 0, mode2 = 0) {
  if (!bot.currentWindow) {
    debug(`No window found for clicking ${slot}`);
    return;
  }
  packets.bump();
  bot.currentWindow.requiresConfirmation = false;
  bot.clickWindow(slot, mode1, mode2)
}

async function getReady() {
  ranit = true;
  let cookieDuration;
  let getReady = new Promise(async (resolve, reject) => {
    logmc("§6[§bTPM§6] §3Staring to get slot data, this will cause the cofl websocket to take a second to be connected");
    await sleep(5000)
    bot.chat("/sbmenu")
    debug("sbmenu opened")
    bot.once('windowOpen', async (window) => {

      if (!nbt.simplify(bot.currentWindow.slots[51].nbt).display.Lore.find(line => line.includes("Duration:"))) {
        debug("No active cookie found, will start to get one");
      }

      if (nbt.simplify(bot.currentWindow.slots[51].nbt).display.Lore.find(line => line.includes("Duration:"))) {
        let duration = nbt.simplify(bot.currentWindow.slots[51].nbt).display.Lore.find(line => line.includes("Duration:")).replace(/§./g, "").replace("Duration: ", "")

        let yearsMatch = duration.match(/(\d+)y/)
        let daysMatch = duration.match(/(\d+)d/)
        let hoursMatch = duration.match(/(\d+)h/)
        let years = yearsMatch ? parseInt(yearsMatch[1], 10) : 0
        let days = daysMatch ? parseInt(daysMatch[1], 10) : 0
        let hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0

        let totalHours = (years * 8760) + (days * 24) + hours

        if (totalHours <= 24 && autoCookie) {
          debug("Cookie duration is less than 24 hours will attempt to buy new one", cookieDuration)
          cookieDuration = totalHours
          // await omgCookie(bot,cookieDuration)
        } else {
          cookieDuration = totalHours
          debug("Cookie duration is 1 day or more, not buying a new one", cookieDuration)
          logmc("§6[§bTPM§6] §3Starting bot with cookie duration of " + cookieDuration + " hours")
        }
      }

      //console.log("check1")
      //console.log("window",bot.currentWindow.title)
      //console.log("item",bot.currentWindow.slots[48].nbt.value.display.value.Name.value)
      if (bot.currentWindow.title.includes("SkyBlock Menu") && bot.currentWindow.slots[48].nbt.value.display.value.Name.value.includes("Profile Management")) {
        //console.log("bonk")

        betterClick(48, 0, 0)
        debug("profile management opened")
        bot.once('windowOpen', async (window) => {
          //.log("check2")
          if (bot.currentWindow.title.includes("Profile Management")) {
            bot.currentWindow.slots.every(async item => {
              //console.log("here-1")
              //console.log("a",item.displayName)
              if (item == null) { return }
              if (item.slot <= 9) { return }
              if (item.slot >= 17) { return }
              if (item.displayName == "Block of Emerald") {
                //console.log("here1")
                let itemNbt = nbt.simplify(item.nbt)
                let coop;
                try { coop = itemNbt.display.Lore.find(line => line.includes("Co-op with")).replace(/§./g, "") } catch { }
                if (coop) {
                  // Regular expressions for the two formats
                  const coopRegexPlayers = /Co-op with (\d+) players:/;
                  const coopRegexSinglePlayer = /Co-op with (?:\[.*\]\s*)?([\w]+)/;


                  // Check for multiple players format
                  const matchPlayers = coop.match(coopRegexPlayers);
                  if (matchPlayers) {
                    const numberOfPlayers = parseInt(matchPlayers[1], 10);
                    debug("COOP", coop, "Number of players:", numberOfPlayers);
                    totalslots = 14 + (numberOfPlayers * 3)
                    debug("max ah slots set to ", totalslots)
                  } else {
                    // Check for single player format
                    const matchSinglePlayer = coop.match(coopRegexSinglePlayer);
                    if (matchSinglePlayer) {
                      const playerName = matchSinglePlayer[1];
                      debug("COOP with single player:", playerName);
                      totalslots = 17;
                      debug("max ah slots set to ", totalslots)
                    } else {
                      error("Unrecognized COOP format:", coop);
                    }
                  }
                } else {
                  // If coop does not exist
                  totalslots = 14;
                  logmc("§6[§bTPM§6] §3Max ah slots set to " + totalslots)
                  debug("No COOP information found");
                }
                await sleep(500)
                debug("done with coop stuff")
                await sleep(500)
                bot.chat('/ah')
                await betterOnce(bot, 'windowOpen');
                //console.log(bot.currentWindow.title,bot.currentWindow.slots[15].nbt.value.display.value.Name.value)
                if ((getWindowName(bot.currentWindow)?.includes("Co-op Auction House") || getWindowName(bot.currentWindow)?.includes("Auction House")) && (bot.currentWindow.slots[15].nbt.value.display.value.Name.value?.includes("Manage Auctions")) || bot.currentWindow.slots[15].nbt.value.display.value.Name.value?.includes("Create Auction")) {
                  bot.currentWindow.slots.every(async item => {
                    if (item == null) { return }
                    if (item.slot == 15) {
                      //console.log("here")
                      //console.log("value",bot.currentWindow.slots[15].nbt.value.display.value.Name.value)
                      let itemNbt = nbt.simplify(item.nbt)
                      let cleanedLoreLines = [];
                      if (itemNbt.display && itemNbt.display.Lore) {
                        cleanedLoreLines = itemNbt.display.Lore.map(line => line.replace(/§./g, ""));
                        //cleanedLoreLines.forEach(cleanedLine => console.log("Cleaned Lore line:", cleanedLine));
                      }
                      let none, one, multiple;
                      try { none = cleanedLoreLines.find(line => line.includes("Set your own items")); } catch { }
                      try { one = cleanedLoreLines.find(line => line.includes("You own 1 auction")); } catch { }
                      try { multiple = cleanedLoreLines.find(line => /You own \d+ auctions/.test(line)); } catch { }
                      // console.log("none",none)
                      // console.log("one",one)
                      // console.log("multiple",multiple)
                      if (none) {
                        currentlisted = 0;
                        debug("current listed set to,", currentlisted)
                      }
                      if (one) {
                        currentlisted = 1;
                        debug("current listed set to,", currentlisted)
                      }
                      if (multiple) {
                        let match = multiple.match(/You own (\d+) auctions in/);
                        if (match && match[1]) {
                          currentlisted = parseInt(match[1], 10);
                          debug("current listed set to,", currentlisted)
                        }
                      }
                      //console.log("done2")
                      await sleep(500)
                      let toclaim1, toclaim2
                      try { toclaim1 = cleanedLoreLines.find(line => line.includes("Your auctions have 1 bid")); } catch { }
                      try { toclaim2 = cleanedLoreLines.find(line => /Your auctions have \d+ bids/.test(line)); } catch { }
                      if (toclaim1) {
                        await sleep(500)
                        if (bot.currentWindow) {

                          betterClick(15, 0, 0)
                        } else {
                          error(`Didn't get a window step 1 of ready`)
                        }
                        await betterOnce(bot, 'windowOpen');
                        await sleep(500)
                        if (bot.currentWindow) {

                          betterClick(10, 0, 0)
                        } else {
                          error(`Didn't get a window step 2 of ready`)
                        }
                        await betterOnce(bot, 'windowOpen');
                        await sleep(500)
                        if (bot.currentWindow) {

                          betterClick(31, 0, 0)
                        } else {
                          error(`Didn't get a window step 3 of ready`)
                        }
                        debug("claimed 1 already sold auction")
                        currentlisted--;
                        debug("currentlisted updated to", currentlisted)
                      }
                      if (toclaim2) {
                        let match = toclaim2.match(/Your auctions have (\d+) bids/);
                        let bids = match && match[1] ? parseInt(match[1], 10) : 0;

                        await sleep(500);
                        if (bot.currentWindow) {

                          betterClick(15, 0, 0)
                        }
                        await betterOnce(bot, 'windowOpen');
                        await sleep(500)

                        const slotsToCheck = [...Array(51).keys()];

                        slotsToCheck.forEach(slot => {
                          let item = bot.currentWindow.slots[slot];
                          if (item && item.nbt && item.nbt.value.display && item.nbt.value.display.value.Name) {
                            let itemName = item.nbt.value.display.value.Name.value;
                            if (!config.ownAuctions) {
                              if (itemName.includes("Claim All") && bot.currentWindow) {
                                //console.log(`Found 'Claim All' at slot ${slot}`);
                                // Perform your action here

                                betterClick(slot, 0, 0);
                              }
                            } else {
                              if (itemName.includes("Claim Your") && bot.currentWindow) {
                                //console.log(`Found 'Claim Your Listings Only' at slot ${slot}`);
                                // Perform your action here

                                betterClick(slot, 0, 0);
                              }
                            }

                          }
                        });
                        // 
                        // betterClick(30, 0, 0);
                        debug("claimed multiple already sold auctions");
                        currentlisted -= bids
                        debug("currentlisted updated to", currentlisted)
                        await betterOnce(bot, 'windowClose')
                        await sleep(350)
                        bot.chat("/ah")
                        await betterOnce(bot, 'windowOpen');
                        if ((getWindowName(bot.currentWindow)?.includes("Co-op Auction House") || getWindowName(bot.currentWindow)?.includes("Auction House")) && (bot.currentWindow.slots[15].nbt.value.display.value.Name.value?.includes("Manage Auctions")) || bot.currentWindow.slots[15].nbt.value.display.value.Name.value?.includes("Create Auction")) {
                          bot.currentWindow.slots.every(async item => {
                            if (item == null) { return }
                            if (item.slot == 15) {
                              //console.log("here")
                              //console.log("value",bot.currentWindow.slots[15].nbt.value.display.value.Name.value)
                              let itemNbt = nbt.simplify(item.nbt)
                              let cleanedLoreLines = [];
                              if (itemNbt.display && itemNbt.display.Lore) {
                                cleanedLoreLines = itemNbt.display.Lore.map(line => line.replace(/§./g, ""));
                                //cleanedLoreLines.forEach(cleanedLine => console.log("Cleaned Lore line:", cleanedLine));
                              }
                              let none, one, multiple;
                              try { none = cleanedLoreLines.find(line => line.includes("Set your own items")); } catch { }
                              try { one = cleanedLoreLines.find(line => line.includes("You own 1 auction")); } catch { }
                              try { multiple = cleanedLoreLines.find(line => /You own \d+ auctions/.test(line)); } catch { }
                              // console.log("none",none)
                              // console.log("one",one)
                              // console.log("multiple",multiple)
                              if (none) {
                                currentlisted = 0;
                                debug("[SECOND PASS] current reset to,", currentlisted)
                              }
                              if (one) {
                                currentlisted = 1;
                                debug("[SECOND PASS] current reset to,", currentlisted)
                              }
                              if (multiple) {
                                let match = multiple.match(/You own (\d+) auctions in/);
                                if (match && match[1]) {
                                  currentlisted = parseInt(match[1], 10);
                                  debug("[SECOND PASS] current listed reset to,", currentlisted)
                                }
                              }
                            }
                          })
                        }
                      }
                      if (!toclaim1 && !toclaim2) {
                        debug("no previously sold auctions to claim, proceeeding...")
                        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
                      } else {
                        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
                      }
                      resolve("ready to start flipping, connecting to socket")
                    }
                  })

                }
                //resolve("Ready to scan (all filters set)")
                //seller = itemNbt.display.Lore.find(line => line.includes("Seller:")).replace(/§./g, "")
                //let price = itemNbt.display.Lore.findIndex((element) => element.includes("Buy it now: "))
              }
            })
          }
        })
      }
      // console.log(`Opened - ${window.title}`)      
      // console.log("trying category")

    })
  })
  //console.log(bot.currentWindow.title)
  await getReady.then((message) => { debug(message) })
  await sleep(1000)
  if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
  logmc("§6[§bTPM§6] §3Finished getting slot data");
  recentPurse = getPurse(bot, recentPurse);
  if (cookieDuration <= 24 && autoCookie) {
    if (recentPurse < await getCookiePrice()) {
      logmc("§6[§bTPM§6] §cHaha you're poor and can't afford a cookie");
    } else {
      logmc("§6[§bTPM§6] §3Buying new cookie because yours will expire soon")
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
      await sleep(250)
      cookieDuration = await omgCookie(bot, cookieDuration)
      if (cookieDuration == 0) {
        logmc("§6[§bTPM§6] §cYou started the bot with no cookie active, please eat one and rs bot (sadly this can't really be safely automated because it requires pathfinding so you'll have to do it manually)")
      }
      await sleep(500)
    }
  }
  bot.state = null;
  startWS(session);
  lastAction = Date.now();
}

async function relistHandler(purchasedAhids, purchasedPrices) {
  bot.state = "listing"
  relistClaim = false;
  let itemuuid;
  let idToRelist = purchasedAhids;
  let priceToRelist = purchasedPrices;
  //ChatLib.chat(`Starting relist process for item with id: ${idToRelist}`)
  debug("Starting relist process for item with ahid:", idToRelist, "and target:", priceToRelist, 'bot state:', bot.state);
  bot.chat(`/viewauction ${idToRelist}`);
  await betterOnce(bot, 'windowOpen');
  if (getWindowName(bot.currentWindow)?.includes("BIN Auction View")) {
    await sleep(500)
    debug("BIN Auction View opened")
    try {
      itemuuid = nbt.simplify(bot.currentWindow?.slots[13]?.nbt)?.ExtraAttributes?.uuid
    } catch (e) {
      error(`[TPM] Error getting item UUID, leaving listing`);
      bot.state = null;
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
      return;
    }

    betterClick(31, 0, 0)
    debug("claim click")
    await sleep(500)
    if (cdClaim > 0 && bot.currentWindow) {

      betterClick(31, 0, 0)
      debug("claim click 2 (after first cooldown)")
      await sleep(200)
      if (!relistClaim) {
        logmc("§6[§bTPM§6] §cAborting relist after 2 failed item claim attempts")
        //readd idToRelist and PriceToRelist to the front of the arrays
        purchasedAhids.unshift(idToRelist);
        purchasedPrices.unshift(priceToRelist);
        stateManger.add({ id: purchasedAhids, targets: purchasedPrices }, Infinity, 'listing');
        bot.state = null;
        cdClaim = 0;
        return;
      }
    }
    if (fullInv && bot.currentWindow) {

      betterClick(31, 0, 0)
      debug("claim click 2 (after full inv)")
      await sleep(200)
      //ping on this
      //turn off relist ig?
      logmc("§6[§bTPM§6] §cAborting relist because of full inventory (unable to claim item for relist)")
      const embed = new MessageBuilder()
        .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
        .setTitle('Inventory Full')
        .addField('', `Unable to claim item for relist due to full inventory. Please log on and clear space in inventory to continue auto relisting (:`)
        .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
        .setColor(2615974);
      sendDiscord(embed);
      bot.state = null;
      return;
    }

  }
  //await sleep(500);
  debug("opening /ah")
  bot.chat("/ah")
  debug("price " + priceToRelist)
  waitting = await betterOnce(bot, 'windowOpen');
  debug("did /ah")
  if (!waitting || !bot.currentWindow) {
    logmc("§6[§bTPM§6] §cWas not able to open AH to sell item, trying again");
    await sleep(200);
    bot.chat("/ah")
    debug(`running /ah`)
    waitting = await betterOnce(bot, 'windowOpen');
    if (!waitting || !bot.currentWindow) {
      logmc("§6[§bTPM§6] §cFailed again, aborting!!!");
      bot.state = null;
      lastAction = Date.now();
      return;
    }
  }
  bot.currentWindow?.slots.every(async item => {
    if (item == null) { return }
    if (nbt.simplify(item?.nbt)?.ExtraAttributes?.uuid == itemuuid) {
      debug("found item in inventory to relist with uuid", itemuuid)
      uuidFound = true;
      await sleep(200)
      betterClick(item.slot, 0, 0)
      debug("added item into ah menu")
    }
  })
  if (!uuidFound) {
    logmc("§6[§bTPM§6] §cItem not found in inventory please report this (: Aborting relist process for this item ):")
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    await sleep(250)
    bot.state = null;
    logmc("§6[§bTPM§6] §3Hopefully exited annoying bug safely (if not report this)")
    return;
  }
  uuidFound = false;
  await betterOnce(bot, 'windowOpen');
  if ((getWindowName(bot.currentWindow)?.includes("Create BIN Auction")) && bot.currentWindow.slots[33].nbt.value.display.value.Name.value?.includes("6 Hours")) {
    debug("Auction Duration Menu Opened")
    await sleep(200)
    betterClick(33, 0, 0)
  } else if (!getWindowName(bot.currentWindow)?.includes('Create BIN Auction')) {
    logmc("§6[§bTPM§6] §cItem probably already in slot, attempting to remove it");
    await sleep(200)
    betterClick(15, 0, 0)
    await betterOnce(bot, 'windowOpen');
    if (getWindowName(bot.currentWindow)?.includes('Manage Auctions')) {
      let createSlot = bot.currentWindow.slots.find(obj => obj?.nbt?.value?.display?.value?.Name?.value?.includes('Create Auction'));
      createSlot = createSlot.slot;
      debug(`Found create slot ${createSlot}`);
      if (!createSlot) {
        logmc("§6[§bTPM§6] §cFailed to find create slot :( leaving relist and there's an item in the slot");
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
        await sleep(250)
        bot.state = null;
        return;
      } else {
        betterClick(createSlot, 0, 0)
        await betterOnce(bot, 'windowOpen');
        await sleep(250);
        if (getWindowName(bot.currentWindow)?.includes('Create BIN Auction')) {
          betterClick(13, 0, 0)
          await sleep(250)
          bot.state = null;
          if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
          logmc("§6[§bTPM§6] §cRemoved item from slot")
          return;
        } else {
          logmc(`§6[§bTPM§6] §cFailed to open BIN Auction got ${getWindowName(bot.currentWindow)}. Leaving relist and there's an item in the slot btw`);
          if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
          await sleep(250)
          bot.state = null;
          return;
        }
      }
    } else if (getWindowName(bot.currentWindow)?.includes('Create BIN Auction') || getWindowName(bot.currentWindow)?.includes('Create Auction')) {
      if (getWindowName(bot.currentWindow)?.includes('Create Auction')) {
        await sleep(250);
        betterClick(48, 0, 0);
        await sleep(250);
      }
      betterClick(13, 0, 0)
      await sleep(250)
      bot.state = null;
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
      logmc("§6[§bTPM§6] §cRemoved item from slot")
      return;
    } else {
      logmc(`§6[§bTPM§6] §cFailed to open Manage auctions got ${getWindowName(bot.currentWindow)}. Leaving relist and there's an item in the slot btw`);
      if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
      await sleep(250)
      bot.state = null;
      return;
    }
  }
  await betterOnce(bot, 'windowOpen');
  if (bot.currentWindow?.title?.includes("Auction Duration")) {
    betterClick(14, 0, 0)
    debug("Auction Duration set to 2 days")
  }
  await betterOnce(bot, 'windowOpen');
  if ((getWindowName(bot.currentWindow)?.includes("Create BIN Auction") || getWindowName(bot.currentWindow)?.includes("Create Auction")) && bot.currentWindow.slots[33].nbt.value.display.value.Name.value?.includes("2 Days")) {
    if (getWindowName(bot.currentWindow)?.includes('Create Auction')) {
      await sleep(250)
      betterClick(48, 0, 0)
      await sleep(250)
    }
    betterClick(31, 0, 0)
    debug("opened bid creation menu")
  }
  await sleep(500)
  //.log("bonkors",bot.currentWindow.title)
  debug("PRICEHERE " + priceToRelist)
  let listpriceomg = (priceToRelist)
  let relistpercent = 100;
  for (let i = 0; i < percentOfTarget.length; i += 3) {
    let lowerBound = percentOfTarget[i];
    let upperBound = percentOfTarget[i + 1];
    let percent = percentOfTarget[i + 2];

    if (priceToRelist >= lowerBound && priceToRelist < upperBound) {
      relistpercent = percent;
      break;
    }
  }
  debug("lpomg " + listpriceomg)
  debug("relistpercent", relistpercent)
  let result = priceToRelist * (relistpercent / 100);
  result = Math.round(result);
  debug("result", result)
  let strResult = result.toString();
  if (strResult.length > 3) {
    let firstThreeDigits = strResult.substring(0, 3);
    let remainingZeros = '0'.repeat(strResult.length - 3);
    listpriceomg = Number(firstThreeDigits + remainingZeros);
  } else {
    listpriceomg = result;
  }
  debug("listprice is", listpriceomg)
  //console.log("here")
  bot._client.write('update_sign', {
    location: bot.entity.position.offset(-1, 0, 0),
    text1: `\"${listpriceomg.toString()}\"`,
    text2: '{"italic":false,"extra":["^^^^^^^^^^^^^^^"],"text":""}',
    text3: '{"italic":false,"extra":["Your auction"],"text":""}',
    text4: '{"italic":false,"extra":["starting bid"],"text":""}'
  });
  debug("set list price to", listpriceomg);
  await sleep(500)
  debug("AAAAAAAAAAAAA", bot.currentWindow?.slots[31]?.nbt?.value?.display?.value?.Name?.value)
  debug("Listed price", listpriceomg)
  let numWithCommas = addCommasToNumber(listpriceomg)
  debug(numWithCommas)
  await sleep(500)
  debug("Debug time:", getWindowName(bot.currentWindow), bot.currentWindow.slots[31].nbt.value.display.value.Name.value, bot.currentWindow.slots[33].nbt.value.display.value.Name.value)
  if (getWindowName(bot.currentWindow)?.includes("Create BIN Auction") && bot.currentWindow.slots[31].nbt.value.display.value.Name.value?.includes(`${numWithCommas} coins`) && bot.currentWindow.slots[33].nbt.value.display.value.Name.value?.includes("2 Days")) {
    betterClick(29, 0, 0)
    debug("bid confirmed, finalizing auction listing")
    lastListedIds.push(idToRelist);
    lastListedTargets.push(listpriceomg);
  } else {
    logmc('§6[§bTPM§6] Failed to list an item.');
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    bot.state = null;
    return;
  }
  await betterOnce(bot, 'windowOpen');
  if (bot.currentWindow?.title.includes("Confirm BIN Auction")) {
    betterClick(11, 0, 0)
    currentlisted++;
    await betterOnce(bot, 'windowOpen');
    if (bot.currentWindow?.slots[29]?.type == 394 && (getWindowName(bot.currentWindow)?.includes("BIN Auction View"))) {
      logmc("§6[§bTPM§6] §3Auction listed :D");
      bot.closeWindow(bot.currentWindow);
      bot.state = null;
      lastAction = Date.now();
      debug(`Current listed: ${currentlisted}`);
    }
  }
}

if (!session) {
  session = randomUUID();
  config.session = session;
  sidListener(config);
}

// start bot
async function start() {
  let uuid = config.uuid;
  let stuckFailsafe = null;
  //const token = ""
  // logging
  /*bot = mineflayer.createBot({
    host: 'hypixel.net',
    port: 25565,
    version: '1.8.9',
    username: ign,
    session: {
      accessToken: token,
      clientToken: uuid,
      selectedProfile: {
        id: uuid,
        name: ign,
        keepAlive: false,
      },
    },
    auth: 'mojang',
    skipValidation: true,
  });*/
  bot = mineflayer.createBot({
    username: ign,
    auth: 'microsoft',
    logErrors: true,
    version: '1.8.9',
    host: 'play.hypixel.net',
  });


  await makePackets(bot._client);
  giveTheFunStuff(bot, handleCommand);
  packets = getPackets();
  bot.once("login", () => {
    // const _botchat = bot.chat;
    // bot.chat = (...args) => {
    //   console.log(`[CHAT] ${args.join(" ")}`);
    //   _botchat(...args);
    // };
    axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${bot.username}`)
      .then((response) => {
        uuid = response.data.id;
        config.uuid = uuid;
        config.username = bot.username;
        updateConfig(config);
      })
      .catch((error) => {
        console.error(`Error fetching UUID for ign ${bot.username}:`, error);
      });
  });
  bot.state = 'moving';
  let firstGui;
  bot._client.on('open_window', async (window) => {
    try {
      const windowID = window.windowId;
      const nextWindowID = windowID === 100 ? 1 : windowID + 1
      const windowName = window.windowTitle;
      useSkipOnFlip = useSkip || (quickProfit >= skipProfit) || (skipUser && quickFinder === 'USER');
      let skipMessages = [];
      if (useSkip) skipMessages.push('you have useSkip enabled');
      if (!useSkip && quickProfit >= skipProfit) skipMessages.push('it was over min skip profit');
      if (!useSkip && skipUser && quickFinder === 'USER') skipMessages.push('it was a user flip');
      debug(`Found new window ${windowName}, ${windowID}`);
      packets.confirmClick(windowID);
      if (windowName === '{"italic":false,"extra":[{"text":"BIN Auction View"}],"text":""}' && bot.state !== 'listing') {
        firstGui = Date.now();
        let item = await itemLoad(31);
        const itemName = item.name;
        debug(`found ${itemName} in window ID ${windowID}`);
        switch (itemName) {
          case "gold_nugget":
            packets.click(31, windowID, 371);
            betterClick(31, 0, 0); //sometimes the first one doesn't register just praying this will register if first doesn't
            if (useSkipOnFlip) {
              packets.click(11, nextWindowID, 159);
              recentlySkipped = true;
              logmc(`§6[§bTPM§6] Used skip on this flip because ${skipMessages.join(' and ')}.`);
              debug(`Skip is on!`);
            }
            lastAction = firstGui;
            break;
          case 'poisonous_potato':
            logmc(`§6[§bTPM§6] Can't afford flip, closing GUI.`)
            bot.closeWindow(bot.currentWindow);
            lastAction = firstGui;
            bot.state = null;
            break;
          case 'potato':
            logmc(`§6[§bTPM§6] Potatoed, closing GUI.`)
            bot.closeWindow(bot.currentWindow);
            lastAction = firstGui;
            bot.state = null;
            break;
          case 'feather':
            item = (await itemLoad(31, true)).name;
            if (item === 'gold_block') {
              betterClick(31, 0, 0);
              currentlisted--;
              lastAction = firstGui;
              break;
            } else if (item === 'potato') {
              logmc(`§6[§bTPM§6] Potatoed, closing GUI.`)
              bot.closeWindow(bot.currentWindow);
              lastAction = firstGui;
            } else {
              error(`Item ${item} not found for feather. Please report this`)
              bot.closeWindow(bot.currentWindow);
              lastAction = firstGui;
            }
            bot.state = null;
            break;
          case 'gold_block':
            betterClick(31, 0, 0);
            currentlisted--;
            lastAction = firstGui;
            bot.state = null;
            break;
          case "bed":
            logmc(`§6[§bTPM§6] Found a bed!`);
            lastAction = firstGui;
            break;
        }
      } else if (windowName === '{"italic":false,"extra":[{"text":"Confirm Purchase"}],"text":""}') {
        confirmAt = Date.now() - firstGui
        logmc(`§6[§bTPM§6] §3Confirm at ${confirmAt}ms`);
        if (!recentlySkipped) {
          await itemLoad(11);
          betterClick(11, 0, 0);
          debug(`Clicking confirm ${window.windowId}`);
        } else {
          recentlySkipped = false;
        }
        if (bedSpam || bedFailed) {
          for (i = 1; i < 11; i++) {
            await sleep(30);
            if (getWindowName(bot.currentWindow)) {
              betterClick(11, 0, 0);
            } else {
              break;
            }
          }
        }
        bot.state = null;
      }
    } catch (e) {
      error(e)
    }
  })

  /*Window.on('newWindow', async window => {
    
    const name = getWindowName(window);
    lastGui = Date.now();
    if (name === 'BIN Auction View' && bot.state !== 'listing') {
      debug("bot state", bot.state)
      //betterClick(31, 0, 0);
      lastLeftBuying = Date.now();
      bot.state = 'buying';
      firstGui = lastGui;
      await sleep(6);
      const item = bot.currentWindow?.slots[31]?.name;
      switch (item) {
        case 'poisonous_potato':
          bot.closeWindow(bot.currentWindow);
          bot.state = null;
          break;
        case 'potato':
          bot.closeWindow(bot.currentWindow);
          bot.state = null;
          break;
        case 'feather':
          bot.closeWindow(bot.currentWindow);
          bot.state = null;
          break;
        case 'gold_block':
          bot.state = null;
          break;
      }
    } else if (name === 'Confirm Purchase') {
      betterClick(11, 0, 0);
      logmc(`§6[§bTPM§6] §3Confirm at ${Date.now() - firstGui}ms`);
      if (bedSpam || bedFailed) {
        for (i = 1; i < 11; i++) {
          await sleep(30);
          if (getWindowName(bot.currentWindow)) {
            betterClick(11, 0, 0)
          } else {
            i = 11;
          }
        }
      }
      bot.state = null;
    }
  });*/
  /*setInterval(() => {
    //Custom window handler
    check(bot);
  }, 1);*/
  let old = bot.state;
  setInterval(async () => {
    //Queue
    let toRun = false;
    let worked = true;
    const current = stateManger.get();
    if (bot.state !== old) debug(`Bot state updated: ${bot.state}`);
    old = bot.state;
    const time = Date.now();
    if (current && bot.state === null && time - lastAction > delay) {
      const command = current.command;
      lastAction = time;
      if (command === 'claim') {
        bot.state = 'claiming';
        await claimBought();
        toRun = 'claimBought';
        bot.state = null;
      } else if (current.state === 'claiming') {
        bot.state = 'claiming';
        await claimSold(command);
        toRun = 'claimSold';
        bot.state = null;
      } else if (command?.id) {
        toRun = 'listing'
        if (currentlisted == totalslots) {
          debug(`AH full, not listing from queue`);
          worked = false;
        }
        if (fullInv) {
          logmc("§6[§bTPM§6] §cNot attempting to relist because your inventory is full. You will need to log in and clear your inventory to continue")
          bot.state = null;
        } else if (lastAction - lastRelistCheck > 10000) {
          lastRelistCheck = lastAction;
          await sleep(10000)
          if (relistCheck(currentlisted, totalslots, bot.state)) {
            bot.state = "listing";
            await sleep(500);
            relistHandler(command.id, command.targets);
          } else {
            worked = false;
          }
        }
      } else {
        try {
          const ahhhhh = webhookPricing[command];
          debug(`WebhookPricing: ${JSON.stringify(ahhhhh)}`);
          if (ahhhhh) {//crash :(
            if (!bot.currentWindow) {
              const ahid = ahhhhh.auctionId
              bot.state = current.state;
              bedFailed = true;
              debug('Bed is now failed')
              currentOpen = ahid
              quickProfit = IHATETAXES(ahhhhh.profit) - ahhhhh.startingBid;
              quickFinder = ahhhhh.finder.toUpperCase()
              bot.chat(`/viewauction ${ahid}`);
              toRun = `/viewauction ${ahid}`
              relistObject[command] = {
                id: ahid,
                target: ahhhhh.target,
                finder: ahhhhh.finder,
                tag: ahhhhh.tag,
                profit: ahhhhh.profit
              };
              debug(`Relist object: ${JSON.stringify(relistObject[command])}`)
            } else {
              debug(`A window is open!!! Not opening from queue`);
              worked = false;
            }
          } else {
            error(`Ahhh didn't find ${command} in ${JSON.stringify(webhookPricing)} leaving queue and not changing state`);
            stateManger.next();
            worked = false;
          }
        } catch (e) {
          error(e)
        }
      }
      if (worked) {
        stateManger.next();
        debug(`Turning state into ${bot.state} and running ${toRun} at ${lastAction}`);
      }
    }
    await sleep(50);
    if (bot.state === 'buying' && Date.now() - lastLeftBuying > 5000) {
      error("Bot state issue detected, resetting state and hopefully fixing queue lock issue")
      debug("Bot state issue detected slot 31 and 11 IDS:", bot.currentWindow?.slots[31]?.name, bot.currentWindow?.slots[11]?.name)
      await makePackets(bot._client);
      packets = getPackets();
      if (bot.currentWindow) {
        bot.closeWindow(bot.currentWindow);
        debug(`Got stuck on ${getWindowName(bot.currentWindow)}`);
      }
      await sleep(200)
      bot.state = null;
      lastAction = Date.now();
    }
  }, delay);
  bot.once('spawn', async () => {
    //Auto join SB
    await checkVersion(botVersion)
    await bot.waitForChunksToLoad();
    bot.state = 'moving';
    // setInterval(() => {
    //   const board = bot.scoreboard?.sidebar?.items;
    //   if (!board) {
    //     bot.chat('/l');
    //     return;
    //   }
    //   let scoreboard = bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, ''));
    //   scoreboard.forEach(async line => {
    //     if (line.includes('Village')) {
    //       bot.state = 'moving';
    //       logmc('§6[§bTPM§6] §cBot found in the hub :( going back to skyblock')
    //       bot.chat('/is');
    //       lastAction = Date.now();
    //     }
    //     if (line.includes('Rank:')) {
    //       bot.state = 'moving';
    //       logmc('§6[§bTPM§6] §cBot found in the lobby :( going back to skyblock')
    //       bot.chat('/play sb');
    //       lastAction = Date.now();
    //     }
    //     if (line.includes('bugs')) {
    //       bot.state = 'moving';
    //       logmc('§6[§bTPM§6] §cBot found in the lobby :( going back to skyblock')
    //       bot.chat('/play sb');
    //       lastAction = Date.now();
    //     }
    //     if (line.includes('Your Island')) {
    //       if (!ranit) {
    //         getReady()
    //       } else {
    //         if (bot.state === 'moving') bot.state = null;
    //         lastAction = Date.now();
    //       }
    //     }
    //   });
    // }, 30000);
  });
  bot.on('scoreboardCreated', utils.throttle(async (scoreboard, updated) => {
    //if (Date.now() - lastCrated < 500) {
    lastCrated = Date.now();
    await sleep(2000)
    bot.chat("/locraw")
    //}
  }), 500);
  bot.on('error', e => {
    // error :(
    error(e);
  });
  bot.on('message', async (message, type) => {
    let text = message.getText(null);
    if (type === 'chat') {
      logmc(message.toAnsi());
    }
    switch (text) {
      case 'Putting coins in escrow...':
        if (!buyspeed || confirmAt !== oldConfirmAt) {
          buyspeed = Date.now() - firstGui
          oldConfirmAt = confirmAt;
        }
        logmc(`§6[§bTPM§6] §3Auction bought in ${buyspeed}ms`);
        bot.state = null;
        if (bot.currentWindow && !closedGui && !useSkip) bot.closeWindow(bot.currentWindow);
        closedGui = true;
        break;
      case "This auction wasn't found!":
        bot.state = null;
        break;
      case "The auctioneer has closed this auction!":
      case "You don't have enough coins to afford this bid!":
        bot.state = null;
        if (bot.currentWindow && !closedGui && !useSkip) bot.closeWindow(bot.currentWindow);
        closedGui = true;
        break;
      case '/limbo for more information.':
        await sleep(5000);
        bot.state = 'moving';
        bot.chat('/lobby');
      case 'You may only use this command after 4s on the server!':
        bot.state = null;
        break;
      case "You didn't participate in this auction!":
        bot.state = null;
        break;
      case "Claiming this auction is on cooldown!":
        cdClaim++;
        break;
      case "There isn't enough space in your inventory!":
        fullInv = true;
        break;
      case "You cannot view this auction!":
        const time = Date.now();
        if (time - lastSentCookie > 300_000) {
          lastSentCookie = time;
          if (webhook) {
            try {
              const webhhookData = {
                username: "TPM",
                avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
                content: ping,
                embeds: [{
                  title: 'Your cookie is gone :(',
                  color: 16629250,
                  fields: [
                    {
                      name: '',
                      value: `You can't flip!!!`,
                    }
                  ],
                  thumbnail: {
                    url: `https://mc-heads.net/head/${config.uuid}.png`,
                  },
                  footer: {
                    text: `The "Perfect" Macro`,
                    icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                  }
                }]
              }
              if (Array.isArray(webhook)) {
                webhook.forEach(async hook => {
                  await axios.post(hook, webhhookData)
                })
              } else {
                await axios.post(config.webhook, webhhookData)
              }
            } catch (e) {
              console.error(`Couldn't post axios `, e);
              const embed = new MessageBuilder()
                .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                .setTitle('Your cookie is gone :(')
                .addField('', `You can't flip!!!`)
                .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                .setColor(9830424);
              sendDiscord(embed);
            }
          }
        }
        break;
      case "Booster cookie expires in 30 minutes":
        if (config.autoCookie) {
          cookieDuration = 1
          await omgCookie(bot, cookieDuration)
        }

        let whMessage = '';

        if (config.autoCookie) whMessage = `Your cookie is about to run out. Attempting to buy new one bc u have that enabled.`
        else whMessage = `You have 30 minutes to buy one or else. Make it quick. (consider enabling autocookie in config :D)`

        if (webhook) {
          try {
            const webhhookData = {
              username: "TPM",
              avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
              content: ping,
              embeds: [{
                title: 'Your cookie is almost gone!',
                color: 16629250,
                fields: [
                  {
                    name: '',
                    value: whMessage,
                  }
                ],
                thumbnail: {
                  url: `https://mc-heads.net/head/${config.uuid}.png`,
                },
                footer: {
                  text: `The "Perfect" Macro`,
                  icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
              }]
            }
            if (Array.isArray(webhook)) {
              webhook.forEach(async hook => {
                await axios.post(hook, webhhookData)
              })
            } else {
              await axios.post(config.webhook, webhhookData)
            }
          } catch (e) {
            console.error(`Couldn't post axios `, e);
            const embed = new MessageBuilder()
              .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
              .setTitle('Your cookie is almost gone!')
              .addField('', whMessage)
              .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
              .setColor(9830424);
            sendDiscord(embed)
          }
        }
        break;
      case "You reached the daily limit of coins you may bid on the auction house!":
        let est8 = new Date();
        est8.setUTCHours(20 + (5 - new Date().getTimezoneOffset() / 60), 0, 0, 0);
        if (new Date() > est8) est8.setDate(est8.getDate() + 1);

        let untilest8 = est8 - new Date();
        let hours = Math.floor(untilest8 / 3600000);
        let minutes = Math.floor((untilest8 % 3600000) / 60000);

        logmc(`§6[§bTPM§6] §cWomp Womp, you hit daily limit ): Pausing bot for ${hours} hours and ${minutes} minutes until it resets`);

        if (dailyLimit) {
          await sleep(200)
          bot.state = 'paused';
          setTimeout(() => {
            bot.state = null;
            logmc("§6[§bTPM§6] §cBot is now active again! Daily limit has reset.");
          }, untilest8);
          break;
        }

        let messageyyY = '';

        if (config.dailyLimit) messageyyY = `You can't flip until 8pm est. Pausing bot for ${hours} hours and ${minutes} minutes until limit resets`
        else messageyyY = `'You can't flip until 8pm est :('`
        if (webhook) {
          try {
            const webhhookData = {
              username: "TPM",
              avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
              content: ping,
              embeds: [{
                title: 'Auction house bid limit!',
                color: 16629250,
                fields: [
                  {
                    name: '',
                    value: messageyyY,
                  }
                ],
                thumbnail: {
                  url: `https://mc-heads.net/head/${config.uuid}.png`,
                },
                footer: {
                  text: `The "Perfect" Macro`,
                  icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
              }]
            }
            if (Array.isArray(webhook)) {
              webhook.forEach(async hook => {
                await axios.post(hook, webhhookData)
              })
            } else {
              await axios.post(config.webhook, webhhookData)
            }
          } catch (e) {
            console.error(`Couldn't post axios `, e);
            const embed = new MessageBuilder()
              .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
              .setTitle('Auction house bid limit!')
              .addField('', messageyyY)
              .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
              .setColor(9830424);
            sendDiscord(embed);
          }
        }

        if (dailyLimit) {
          bot.state = 'paused';
        }

        break;
    }
    if (text.includes(`"map":"Private Island"`)) {
      await sleep(2000)
      if (friendIsland && !happened) {
        //console.log("friend island", friendIsland) 
        await sleep(500)
        //await sleep(5000)
        //console.log("/visit " + friendIsland)
        bot.chat(`/visit ${friendIsland}`)
        await betterOnce(bot, 'windowOpen');
        if (!(nbt.simplify(bot.currentWindow.slots[11].nbt)?.display?.Lore?.find(line => line?.includes("Already on island!")))) {
          await sleep(2000)
          stillacat = await visitFrend(bot, friendIsland)
          await sleep(3000)
          if (!stillacat) {
            logmc("§6[§bTPM§6] §cYep ur on your own island but your friend island is closed idiot change it so you stay on island")
          }
        } else {
          if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
        }
        happened = true;
      }
      debug("Current location updated to island")
      if (bot.state === 'moving') bot.state = null;
      if (!ranit) {
        getReady()
      }
    }
    else if (text.includes(`"gametype":"SKYBLOCK"`)) {
      bot.state = 'moving';
      await sleep(2000)
      debug("Currently in hub, attempting to go to island!")
      location = "hub"
      if (friendIsland) {
        omgitscat = await visitFrend(bot, friendIsland)
        if (!omgitscat) {
          bot.chat("/is")
        }
      } else {
        bot.chat("/is")
      }
    }
    if (text.includes(`"gametype":"PROTOTYPE"`)) {
      bot.state = 'moving';
      await sleep(2000)
      debug("Currently in lobby, attempting to go to skyblock!")
      location = "lobby"
      bot.chat("/skyblock")
    }
    if (text.includes(`"gametype":"MAIN"`)) {
      bot.state = 'moving';
      await sleep(2000)
      debug("Currently in lobby, attempting to go to skyblock!")
      location = "lobby"
      bot.chat("/skyblock")
    }
    if (text.includes(`"gametype":"BEDWARS"`)) {
      bot.state = 'moving';
      await sleep(2000)
      debug("Currently in lobby, attempting to go to skyblock!")
      location = "lobby"
      bot.chat("/skyblock")
    }
    if (text.includes(`"gametype":"SKYWARS"`)) {
      bot.state = 'moving';
      await sleep(2000)
      debug("Currently in lobby, attempting to go to skyblock!")
      location = "lobby"
      bot.chat("/skyblock")
    }
    if (text.includes(`"gametype":"WOOL_GAMES"`)) {
      bot.state = 'moving';
      await sleep(2000)
      debug("Currently in lobby, attempting to go to skyblock!")
      location = "lobby"
      bot.chat("/skyblock")
    }
    if (text.includes("You were kicked while joining that server!")) {
      bot.state = 'moving';
      await sleep(5000)
      bot.chat("/play sb")
      debug("Warping to skyblock")
    }
    if (text.includes("Cannot join SkyBlock")) {
      bot.state = 'moving';
      await sleep(5000)
      bot.chat("/play sb")
      debug("Warping to skyblock")
    }
    if (text.includes("Cannot send chat message")) {
      bot.state = 'moving';
      await sleep(5000)
      debug("Warping to lobby")
      bot.chat("/l")
    }
    if (text.includes("There was a problem joining SkyBlock, try again in a moment!")) {
      bot.state = 'moving';
      await sleep(5000)
      debug("Warping to lobby")
      bot.chat("/skyblock")
    }
    if (text.includes("Couldn't warp you! Try again later.")) {
      bot.state = 'moving';
      await sleep(5000)
      bot.chat("/locraw")
      debug("rechecking location bc warp failed")
    }

    if (/You claimed (.+?) from (?:\[.*?\] )?(.+?)'s auction!/.test(text) && config.relist && text.startsWith('You')) {
      relistClaim = true;
      if (bot.state === 'claiming') bot.state = null;
    }


    const regex = /BIN Auction started for (.+?)!/;
    const match33 = text.match(regex);
    if (match33 && text.startsWith('BIN')) {
      bot.state = null;
      const item = match33[1];
      const auctionUrl = `https://sky.coflnet.com/auction/${lastListedIds.shift()}`;
      const purse = formatNumber(getPurse(bot, recentPurse));
      setTimeout(() => {
        recentPurse = getPurse(bot);
      }, 1000)
      if (webhook) {
        const embed = new MessageBuilder()
          .setFooter(`The "Perfect" Macro - Purse: ${purse}`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
          .setTitle('Item listed')
          .addField('', `Listed \`${item}\` for \`${addCommasToNumber(lastListedTargets.shift())} coins\` [click](${auctionUrl}) \n [AH Slots: ${currentlisted}/${totalslots}]`)
          .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
          .setColor(13677311);
        sendDiscord(embed)
      }
      sendScoreboard();
    }

    const regex1 = /You purchased (.+?) for ([\d,]+) coins!/;
    const match1 = text.match(regex1);
    if (match1 && text.startsWith('You')) {
      if (bot.state == 'buying') bot.state = null;
      boughtItems++
      let lastPurchasedAhid;
      let lastPurchasedTarget;
      let lastPurchasedFinder;
      const item = utils.noColorCodes(match1[1]).replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, "");
      const object = relistObject[item];
      debug(`Object after buying: ${JSON.stringify(object)}`)
      if (lastOpenedAhids.length > 0 && config.relist) {
        if (object) {
          lastPurchasedAhid = object.id
          lastPurchasedTarget = object.target
          lastPurchasedFinder = object.finder
          const itemTag = object.tag
          const profit = object.profit;
          if (!badFinders?.includes(lastPurchasedFinder)) {
            if (!dontListItems.includes(itemTag)) {
              if (profit < dontListProfitOver && profit > 0) {
                if (dontListSkins && (!item.includes('✦') && !item.toLowerCase().includes('skin') && !item.includes('✿'))) {
                  purchasedFinders.push(lastPurchasedFinder);
                  setTimeout(async () => {
                    if (bot.state === null) {
                      //bot.state = 'listing';
                      if (fullInv) {
                        logmc("§6[§bTPM§6] §cNot attempting to relist because your inventory is full. You will need to log in and clear your inventory to continue")
                        bot.state = null;
                      } else {
                        if (relistCheck(currentlisted, totalslots, bot.state)) {
                          bot.state = "listing";
                          await sleep(500);
                          relistHandler(lastPurchasedAhid, lastPurchasedTarget);
                        } else {
                          debug(`relist check didn't work`);
                          stateManger.add({ id: lastPurchasedAhid, targets: lastPurchasedTarget }, Infinity, 'listing');
                          bot.state = null;
                        }
                      }
                    } else {
                      debug(`bot state check didn't work`);
                      stateManger.add({ id: lastPurchasedAhid, targets: lastPurchasedTarget }, Infinity, 'listing');
                      bot.state = null;
                    }
                  }, 10000);
                } else {
                  logmc(`§6[§bTPM§6] §c${match1[1]} is skinned or is a skin so it's not getting relisted. You can change this in your config file`);
                }
              } else {
                logmc(`§6[§bTPM§6] §c${match1[1]} is ${formatNumber(profit)} profit so it's not getting relisted. You can change this in your config file`);
              }
            } else {
              if (webhook) {
                const embed = new MessageBuilder()
                  .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                  .setTitle('Item not listing')
                  .addField('', `${match1[1]} isn't being listed because it's in your Do Not List Items in your config file`)
                  .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                  .setColor(9830424);
                sendDiscord(embed)
              }
              logmc(`§6[§bTPM§6] §c${match1[1]} is your Do Not List, not relisting`);
            }
          } else {
            logmc(`§6[§bTPM§6] §c${nicerFinders(lastPurchasedFinder)} finder flip found, not relisting`)
            // specialitems(lastPurchasedAhid[lastPurchasedAhid.length - 1])
          }
        } else {
          error(`Didn't find ${item} in ${JSON.stringify(relistObject)} RELIST Please report this to icyhenryt`);
        }
      }
      const price = match1[2];
      if (!webhookPricing[item]) {
        error(`Didn't find ${item} in ${JSON.stringify(webhookPricing)} WEBHOOK Please report this to icyhenryt`);
        return;
      }
      const itemBed = showBed ? webhookPricing[item].bed : "";
      const auctionUrl = `https://sky.coflnet.com/auction/${webhookPricing[item].auctionId}`;
      const profit = utils.IHATETAXES(webhookPricing[item].target) - utils.onlyNumbers(price);
      const purse = utils.formatNumber(getPurse(bot, recentPurse) - parseInt(String(price).replace(/,/g, ''), 10));
      setTimeout(() => {
        recentPurse = getPurse(bot);
      }, 1000)
      if (webhook) {
        if (profit < 100_000_000) {
          const embed = new MessageBuilder()
            .setFooter(`TPM - Found by ${nicerFinders(webhookPricing[item].finder)} - Purse: ${purse} `, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
            .setTitle('Item purchased')
            .addField('', `Bought [\`\`${utils.noColorCodes(match1[1])}\`\`](${auctionUrl}) for \`${price} coins\` (\`${utils.formatNumber(profit)}\` profit) in \`\`${buyspeed}ms\`\` ${itemBed}`)
            .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
            .setColor(2615974);
          sendDiscord(embed)
        } else {
          try {
            await axios.post(config.webhook, {
              username: "TPM",
              avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
              content: ping,
              embeds: [{
                title: 'LEGENDARY FLIP WOOOOO!!!',
                color: 16629250,
                fields: [
                  {
                    name: '',
                    value: `Bought [\`\`${utils.noColorCodes(match1[1])}\`\`](${auctionUrl}) for \`${price} coins\` (\`${utils.formatNumber(profit)}\` profit) in \`\`${buyspeed}ms\`\` ${itemBed}`,
                  }
                ],
                thumbnail: {
                  url: `https://mc-heads.net/head/${config.uuid}.png`,
                },
                footer: {
                  text: `TPM - Found by ${nicerFinders(webhookPricing[item].finder)} - Purse: ${purse}`,
                  icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
              }]
            })
          } catch (e) {
            console.error(`Couldn't post axios `, e);
            const embed = new MessageBuilder()
              .setFooter(`TPM - Found by ${nicerFinders(webhookPricing[item].finder)} - Purse: ${purse} `, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
              .setTitle('LEGENDARY FLIP WOOOOO!!!')
              .addField('', `Bought [\`\`${utils.noColorCodes(match1[1])}\`\`](${auctionUrl}) for \`${price} coins\` (\`${utils.formatNumber(profit)}\` profit) in \`\`${buyspeed}ms\`\` ${itemBed}`)
              .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
              .setColor(16629250);
            sendDiscord(embed)
          }
        }
      }
      sendFlip(webhookPricing[item].auctionId, profit, price, itemBed, utils.noColorCodes(match1[1]), webhookPricing[item].finder, buyspeed)
      buyspeed = null;
      sendScoreboard();
      if (!config.relist) {
        setTimeout(async () => {
          if (bot.state === null) {
            bot.state = 'claiming';
            await claimBought();
            bot.state = null;
          } else {
            stateManger.add('claim', 37, 'claiming');
          }
        }, 500);
      }
    }
    const regex2 = /\[Auction\] (.+?) bought (.+?) for ([\d,]+) coins CLICK/;
    const match2 = text.match(regex2);
    if (match2 && text.startsWith('[Auction]')) {
      soldItems++
      updateSold()
      const buyer = match2[1];
      const item = match2[2];
      const price = utils.onlyNumbers(match2[3]);
      //console.log("purse test BOUGHT", await getPurse(bot, recentPurse), "price", price);
      if (webhook) {
        const purse = utils.formatNumber(getPurse(bot, recentPurse) + parseInt(String(price).replace(/,/g, ''), 10));
        setTimeout(() => {
          recentPurse = getPurse(bot);
        }, 5000)
        const embed = new MessageBuilder()
          .setFooter(`The "Perfect" Macro - Purse: ${purse} `, `https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437`)
          .setTitle('Item Sold')
          .addField('', `Collected \`${addCommasToNumber(price)} coins\` for selling \`${item}\` to \`${buyer}\``)
          .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
          .setColor(16731310);
        sendDiscord(embed)
      }
      setTimeout(async () => {
        clickevent = message.clickEvent.value;
        if (bot.state === null) {
          bot.state = 'claiming';
          await claimSold(clickevent);
          bot.state = null;
          sendScoreboard();
        } else {
          stateManger.add(clickevent, 28, 'claiming');
          debug(`Added ${clickevent} to queue for sold`);
        }
      }, 500);
    }
  });

  function askUser() {
    rl.question('> ', async input => {
      const args = input.trim().split(/\s+/);
      let message = args.slice(1).join(' ');;
      switch (args[0]) {
        case 'chat':
          packets.sendMessage(message);
          break;
        case '/cofl':
        case "/tpm":
        case '/icymacro':
          if (args[1]?.toLowerCase() == 'getping') {
            sendPingStats(ws, handleCommand, bot, soldItems, boughtItems);
          } else {
            handleCommand(input);
          }
          break;
        case "/fc":
          handleCommand(`/cofl chat ${message}`);
          break;
        case "/ping":
        case "/getping":
          sendPingStats(ws, handleCommand, bot, soldItems, boughtItems);
          break;
        case '!c':
          solveCaptcha(args[1]);
          break;
      }
      askUser();
    });
  }
  askUser();
  async function claimBought() {
    bot.chat('/ah');
    await sleep(300);
    if (!bot.currentWindow) return;
    betterClick(13, 0, 0);
    await sleep(300);
    betterClick(10, 0, 0);
    await sleep(50);
  }
  async function claimSold(omgeitsthething) {
    bot.chat(omgeitsthething);
    return;
  }
  ws.on('flip', async msg => {
    let bed = '[NUGGET]';
    const data = JSON.parse(msg.data);
    //console.log(data);
    let itemName;
    let auctionID;
    let currentTime = Date.now();
    if (usingBaf) {
      if (!bot.state && currentTime - lastAction > delay && !bot.currentWindow) {
        lastLeftBuying = currentTime;
        bot.state = 'buying';
        auctionID = data.id;
        quickFinder = data.finder.toUpperCase()
        quickProfit = IHATETAXES(data.target) - data.startingBid
        packets.sendMessage(`/viewauction ${auctionID}`);
        let finder = data.finder;
        let target = data.target;
        itemName = data.itemName.replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, "");
        lastAction = currentTime;
        logmc(`§6[§bTPM§6] §8Opening ${itemName}`);
        closedGui = false;
        bedFailed = false;
        debug('Bed no longer failed')
        currentOpen = data.id;
        lastOpenedTargets.length = 0;
        lastOpenedTargets.push(target);
        lastOpenedAhids.length = 0;
        lastOpenedAhids.push(auctionID);
        lastOpenedFinders.length = 0;
        lastOpenedFinders.push(finder);
        relistObject[noColorCodes(itemName).replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, "")] = {
          id: auctionID,
          target: target,
          finder: data.finder,
          profit: IHATETAXES(target) - data.startingBid,
          tag: data.tag
        };
        debug(`Relist object: ${JSON.stringify(relistObject[weirdName])}`)
      } else {
        auctionID = data.id;
        itemName = data.itemName.replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, "");
        let reasons = [];
        if (bot.state) reasons.push(`bot state is ${bot.state}`);
        if (bot.currentWindow) {
          if (lastID === bot.currentWindow?.id && Date.now() - lastIDTime < 5000 && lastID) {
            debug(`Last ID: ${lastID} Current ID: ${bot.currentWindow?.id}`)
            lastIDTime = Date.now();
            lastID = bot.currentWindow?.id;
            guiName = getWindowName(bot.currentWindow);
            if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); }
            lastAction = Date.now();
            await sleep(200)
            bot.state = null;
            logmc(`§6[§bTPM§6] §cClosed the window ${guiName} because it was the same as the last one to hopefully fix the weird bug (if you keep getting the pipeline error message bc of a certain window report)`)
          } else {
            lastIDTime = Date.now();
            reasons.push(`${getWindowName(bot.currentWindow)} is open`);
          }
          lastID = bot.currentWindow?.id;
          debug(`[After update] Last ID: ${lastID} Current ID: ${bot.currentWindow?.id}`)
        }
        if (currentTime - lastAction < delay) reasons.push(`the last action was too recent`);
        if (bot.state !== 'moving' && bot.state !== 'paused') {
          logmc(`§3Adding ${itemName}§3 to the pipeline because ${reasons.join(' and ')}!`);
          stateManger.add(noColorCodes(itemName), 69, 'buying');
        }
      }
      webhookPricing[noColorCodes(itemName)] = {
        target: data.target,
        price: data.startingBid,
        auctionId: auctionID,
        bed: bed,
        finder: data.finder,
      };
      debug(`Added ${noColorCodes(itemName)} to webhookPricing`)
      idQueue.push(data.id);
      targetQueue.push(data.target);
      finderQueue.push(data.finder);
      const ending = new Date(normalizeDate(data.purchaseAt)).getTime();
      if (currentTime < ending) {
        bed = '[BED]';
        if (webhookPricing[noColorCodes(itemName)]?.bed) {
          webhookPricing[noColorCodes(itemName)].bed = bed;
        } else {
          error(`Super weird, didn't find the item in webhookpricing but like it should've been made idk`);
        }
        //console.log(`bed found, waiting ${ending - Date.now() - waittime} ending: ${ending}`);
        setTimeout(async () => {
          for (i = 0; i < 4; i++) {
            if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
              betterClick(31, 0, 0);
              await sleep(3);
            }
          }
        }, ending - Date.now() - waittime);
        setTimeout(() => {
          if (getWindowName(bot.currentWindow)?.includes('BIN Auction View') && currentOpen === auctionID) {
            bot.closeWindow(bot.currentWindow);
            bot.state = null;
            logmc(`§6[§bTPM§6] §cBed timing failed and we had to abort the auction :( Please lower your waittime if this continues or turn on bedspam`);
          }
        }, 5000);
      }
    } else {
      if (!bot.state && currentTime - lastAction > delay && !bot.currentWindow) {
        auctionID = data.id;
        lastLeftBuying = Date.now();
        bot.state = 'buying';
        quickFinder = data.finder.toUpperCase()
        quickProfit = IHATETAXES(data.target) - data.startingBid
        packets.sendMessage(`/viewauction ${auctionID}`);
        let target = data.target;
        let finder = data.finder;
        bedFailed = false;
        debug(`Bed no longer failed`);
        closedGui = false;
        itemName = data.auction.itemName;
        var weirdName = noColorCodes(itemName).replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, "");
        //console.log(`Opening ${itemName} at ${Date.now()}`);
        logmc(`§6[§bTPM§6] §8Opening ${itemName}`);
        lastAction = currentTime;
        currentOpen = auctionID;
        lastOpenedTargets.length = 0;
        lastOpenedTargets.push(target);
        lastOpenedAhids.length = 0;
        lastOpenedAhids.push(auctionID);
        lastOpenedFinders.length = 0;
        lastOpenedFinders.push(finder);
        relistObject[weirdName] = {
          id: auctionID,
          target: target,
          finder: finder,
          tag: data.auction.tag,
          profit: IHATETAXES(data.target) - data.auction.startingBid
        };
        debug(`Relist object: ${JSON.stringify(relistObject[weirdName])}`)
        //const profit = utils.IHATETAXES(webhookPricing[item].target) - utils.onlyNumbers(price);
      } else {
        auctionID = data.id;
        itemName = data.auction.itemName;
        var weirdName = noColorCodes(itemName).replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, "");
        let reasons = [];
        if (bot.state) reasons.push(`bot state is ${bot.state}`);
        if (bot.currentWindow) reasons.push(`${getWindowName(bot.currentWindow)} is open`);
        if (currentTime - lastAction < delay) reasons.push(`the last action was too recent`);
        if (bot.state !== 'moving' && bot.state !== 'paused') {
          logmc(`§3Adding ${itemName}§3 to the pipeline because ${reasons.join(' and ')}!`);
          stateManger.add(weirdName, 69, 'buying');
        }
      }
      idQueue.push(data.id);
      targetQueue.push(data.target);
      finderQueue.push(data.finder);
      const ending = new Date(normalizeDate(data.auction.start)).getTime() + 20000;
      webhookPricing[weirdName] = {
        target: data.target,
        price: data.auction.startingBid,
        auctionId: auctionID,
        bed: bed,
        finder: data.finder,
        tag: data.auction.tag,
        profit: IHATETAXES(data.target) - data.auction.startingBid
      };
      debug(`Added ${weirdName} to webhookPricing`)
      if (currentTime < ending) {
        bed = '[BED]';
        if (webhookPricing[weirdName]?.bed) {
          webhookPricing[weirdName].bed = bed;
        } else {
          error(`Super weird, didn't find the item in webhookpricing but like it should've been made idk`);
        }
        //console.log(`bed found, waiting ${ending - Date.now() - waittime} ending: ${ending}`);
        setTimeout(async () => {
          for (i = 0; i < 5; i++) {
            if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
              betterClick(31, 0, 0);
              await sleep(3);
            }
          }
        }, ending - currentTime - waittime);
        setTimeout(() => {
          if (getWindowName(bot.currentWindow)?.includes('BIN Auction View') && currentOpen === auctionID) {
            bot.closeWindow(bot.currentWindow);
            bot.state = null;
            logmc(`§6[§bTPM§6] §cBed timing failed and we had to abort the auction :( Please lower your waittime if this continues or turn on bedspam`);
          }
        }, 5000);
      }
    }
    if (!stuckFailsafe) {
      stuckFailsafe = setInterval(() => {
        if (bot.state && Date.now() - lastAction > 30000) {
          logmc(`§6[§bTPM§6] §cGot stuck :( `);
          if (getWindowName(bot.currentWindow)) bot.closeWindow(bot.currentWindow);
          bot.state = null;
          lastAction = Date.now();
        }
      }, 50);
    }
    debug(`Found flip ${itemName} uuid ${auctionID}`);
    sendFlipFound(auctionID);
  });
  setInterval(() => {
    //BED SPAM
    if (!bedSpam && !bedFailed) return;
    if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
      const item = bot.currentWindow?.slots[31]?.name;
      if (item?.includes('bed')) {
        betterClick(31, 0, 0);
      }
    }
  }, clickDelay);
  function sendScoreboard() {
    setTimeout(() => {
      if (!bot?.scoreboard?.sidebar?.items) return;
      if (bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, '')).find(e => e.includes('Purse:') || e.includes('Piggy:'))) {
        send(
          JSON.stringify({
            type: 'uploadScoreboard',
            data: JSON.stringify(bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, '')))
          }), false
        );
      }
    }, 5500);
  }
  ws.on('open', sendScoreboard);
  const settings = msg => {
    console.log(msg);
    privacySettings = new RegExp(msg.chatRegex);
    console.log(`Got settings, ${msg.chatRegex}`)
    ws.off('settings', settings);
  };
  ws.on('settings', settings);
  bot.on('message', (message, type) => {
    if (!privacySettings) return;
    if (type === 'chat') {
      const msg = message.getText(null);
      if (privacySettings.test(msg)) {
        send(
          JSON.stringify({
            type: 'chatBatch',
            data: JSON.stringify([msg]),
          })
        );
      }
    }
  });
  const sendInventoy = () => {
    send(
      JSON.stringify({
        type: 'uploadInventory',
        data: JSON.stringify(bot.inventory),
      }), false
    );
  };
  ws.on('getInventory', sendInventoy);
  bot.on('windowOpen', sendInventoy);
  async function itemLoad(slot, alreadyLoaded = false) {
    return new Promise((resolve, reject) => {
      let index = 1;
      const first = bot.currentWindow?.slots[slot];
      const interval = setInterval(() => {
        const check = bot.currentWindow?.slots[slot];
        if ((check && !alreadyLoaded) || (alreadyLoaded && check !== first)) {
          clearInterval(interval);
          resolve(check);
          debug(`Found item on ${index}`);
        }
        index++
      }, 1);

      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Item didn\'t load in time :('));
      }, 5000);
    });
  }
}
start();
