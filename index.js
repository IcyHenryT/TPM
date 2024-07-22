const mineflayer = require('mineflayer');
const readline = require('readline');
const process = require('process');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const registry = require('prismarine-registry')('1.8.9');
const ChatMessage = require('prismarine-chat')(registry);
const { check, Window } = require('./window.js');
const utils = require(`./utils.js`);
const { randomUUID } = require('crypto');
const { getFile, saveData, makeFile } = require('./fileSystem.js');
const axios = require('axios');
const stateManger = require(`./state.js`);
const { noColorCodes, onlyNumbers, normalizeDate, IHATETAXES, formatNumber, sleep, getWindowName } = require('./utils.js');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { getPackets, makePackets } = require('./packetStuff.js');
const { logmc } = require('./logger.js');
var prompt = require('prompt-sync')();
const { startWS, send, handleCommand, ws, sidListener, solveCaptcha } = require('./websocketHelper.js');
let lastAction = Date.now();
const { config, updateConfig } = require('./config.js');

let ign, bedSpam, discordid, TOS, webhook, usInstance, clickDelay, delay, usingBaf, session, discordbot, waittime;

function testign() {
  if (config.username.trim() === '') {
    ign = prompt(`What's your IGN (caps matter)?`);
    if (ign) {
      config.username = ign;
      updateConfig(config)
    } else {
      logmc(`§cSo close! You need to have an actual ign`);
      testign();
    }
  }
}


function testServer() {
  const userInput = prompt('Use the US Instance? It requires prem+ (y / n)');
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

if (config.TOS.trim() === '') {
  prompt("BY CLICKING ENTER YOU AGREE THAT IT'S NOT ICYHENRYT'S FAULT IF YOU'RE BANNED BECAUSE IT'S IN BETA");
  config.TOS = 'Accepted';
  updateConfig(config)
  testServer();
}


ign = config.username;
webhook = config.webhook;
TOS = config.TOS;
session = config.session;
bedSpam = config.bedSpam;
discordid = config.discordID;
discordbot = config.discordBotToken;
delay = config.delay;
clickDelay = config.clickDelay;
waittime = config.waittime;
usingBaf = config.useBafSocket;
usInstance = config.usInstance;

if (webhook) {
  webhook = new Webhook(webhook);
  webhook.setUsername('TPM');
  webhook.setAvatar('https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless');
}
webhookPricing = {};

let privacySettings;

let lastGui = 0;



if (!session) {
  session = randomUUID();
  config.session = session;
  updateConfig(config)
  sidListener(session);
}

// start bot
async function start() {
  let uuid = config.uuid;
  let stuckFailsafe = null;
  if (!uuid) {
    axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${ign}`)
      .then(response => {
        uuid = response.data.id;
        config.uuid = uuid;
        updateConfig(config)
      })
      .catch(error => {
        console.error('Error fetching UUID:', error);
      });
  }
  // logging
  /*const bot = mineflayer.createBot({
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
  const bot = mineflayer.createBot({
    username: ign,
    auth: 'microsoft',
    logErrors: true,
    version: '1.8.9',
    host: 'play.hypixel.net',
  });
  bot.once('login', () => {
    startWS(session);
  })
  bot.state = 'moving';
  let firstGui;
  Window.on('newWindow', async window => {
    bot.currentWindow.requiresConfirmation = false;
    const name = getWindowName(window);
    lastGui = Date.now();
    if (name === 'BIN Auction View') {
      bot.clickWindow(31, 0, 0);
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
      bot.clickWindow(11, 0, 0);
      logmc(`§6[§bTPM§6] §3Confirm at ${Date.now() - firstGui}ms`);
      for (i = 1; i < 11; i++) {
        if (!bedSpam) i = 11;
        await sleep(30);
        if (getWindowName(bot.currentWindow)) {
          bot.clickWindow(11, 0, 0)
        } else {
          i = 11;
        }
      }
      bot.state = null;
    }
  });
  setInterval(() => {
    //Custom window handler
    check(bot);
  }, 1);
  //let old = bot.state;
  setInterval(async () => {
    //Queue
    const current = stateManger.get();
    //if (bot.state !== old) console.log(`Bot state updated: ${bot.state}`);
    //old = bot.state;
    if (current && bot.state === null && Date.now() - lastAction > delay) {
      bot.state = current.state;
      const command = current.command;
      if (command === 'claim') {
        await claimBought();
        bot.state = null;
      } else if (command === 'sold') {
        await claimSold();
        bot.state = null;
      } else {
        bot.chat(command);
      }
      stateManger.next();
      lastAction = Date.now();
      //console.log(`Turning state into ${bot.state} and running ${current.command}`);
    }
  }, 1);
  bot.once('spawn', async () => {
    //Auto join SB
    await bot.waitForChunksToLoad();
    await sleep(5000);
    bot.state = 'moving';
    bot.chat('/play sb');
    await sleep(5000);
    bot.chat('/is');
    setInterval(() => {
      const board = bot.scoreboard?.sidebar?.items;
      if (!board) {
        bot.chat('/l');
        return;
      }
      let scoreboard = bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, ''));
      scoreboard.forEach(line => {
        if (line.includes('Village')) {
          bot.state = 'moving';
          logmc('§6[§bTPM§6] §cBot found in the hub :( going back to skyblock')
          bot.chat('/is');
          lastAction = Date.now();
        }
        if (line.includes('Rank:')) {
          bot.state = 'moving';
          logmc('§6[§bTPM§6] §cBot found in the lobby :( going back to skyblock')
          bot.chat('/play sb');
          lastAction = Date.now();
        }
        if (line.includes('bugs')) {
          bot.state = 'moving';
          logmc('§6[§bTPM§6] §cBot found in the lobby :( going back to skyblock')
          bot.chat('/play sb');
          lastAction = Date.now();
        }
        if (line.includes('Your Island')) {
          if (bot.state === 'moving') bot.state = null;
          lastAction = Date.now();
        }
      });
    }, 30000);
  });
  bot.on('error', e => {
    // error :(
    console.log(e);
  });
  bot.on('login', () => {
    bot.chat('/locraw');
  });
  bot.on('disconnect', () => {
    console.log("left server maybe idk does this work? I can't find docs");
    bot.state = 'moving';
  });
  bot.on('message', async (message, type) => {
    let text = message.getText(null);
    const msg = new ChatMessage(message);
    if (type === 'chat') {
      console.log(message.toAnsi());
    }
    switch (text) {
      case 'Putting coins in escrow...':
        logmc(`§6[§bTPM§6] §3Auction bought in ${Date.now() - firstGui}ms`);
        bot.state = null;
        break;
      case "This auction wasn't found!":
        bot.state = null;
        break;
      case "The auctioneer has closed this auction!":
      case "You don't have enough coins to afford this bid!":
        bot.state = null;
        bot.closeWindow(bot.currentWindow);
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
    }
    const regex1 = /You purchased (.+?) for ([\d,]+) coins!/;
    const match1 = text.match(regex1);
    if (match1) {
      const item = utils.noColorCodes(match1[1]);
      const price = match1[2];
      if (!webhookPricing[item]) {
        console.log(`Didn't find ${item} in ${JSON.stringify(webhookPricing)} Please report this to icyhenryt`);
        return;
      }
      const itemBed = webhookPricing[item].bed;
      const auctionUrl = `https://sky.coflnet.com/auction/${webhookPricing[item].auctionId}`;
      const profit = utils.IHATETAXES(webhookPricing[item].target) - utils.onlyNumbers(price);
      if (webhook) {
        const embed = new MessageBuilder()
          .setFooter(`The "Perfect" Macro - Found by ${webhookPricing[item].finder}`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
          .setTitle('Item purchased')
          .addField('', `Bought \`${item}\` for \`${price} coins\` (\`${utils.formatNumber(profit)}\` profit) [click](${auctionUrl}) ${itemBed}`)
          .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
          .setColor(2615974);
        webhook.send(embed);
      }
      sendScoreboard();
      setTimeout(async () => {
        if (bot.state === null) {
          bot.state = 'claiming';
          await claimBought();
          bot.state = null;
        } else {
          stateManger.add('claim', Infinity, 'claiming');
        }
      }, 500);
    }
    const regex2 = /\[Auction\] (.+?) bought (.+?) for ([\d,]+) coins CLICK/;
    const match2 = text.match(regex2);
    if (match2) {
      const buyer = match2[1];
      const item = match2[2];
      const price = utils.onlyNumbers(match2[3]);
      if (webhook) {
        const embed = new MessageBuilder()
          .setFooter(`The "Perfect" Macro`, `https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437`)
          .setTitle('Item Sold')
          .addField('', `Collected \`${price} coins\` for selling \`${item}\` to \`${buyer}\``)
          .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
          .setColor(16731310);
        webhook.send(embed);
      }
      setTimeout(async () => {
        if (bot.state === null) {
          bot.state = 'claiming';
          await claimSold();
          bot.state = null;
          sendScoreboard();
        } else {
          stateManger.add('sold', Infinity, 'claiming');
        }
      }, 500);
    }
  });
  function askUser() {
    rl.question('> ', input => {
      const args = input.trim().split(/\s+/);
      switch (args[0]) {
        case 'chat':
          const message = args.slice(1).join(' ');
          packets.sendMessage(message);
          break;
        case '/cofl':
        case '/icymacro':
          handleCommand(input);
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
    bot.currentWindow.requiresConfirmation = false;
    bot.clickWindow(13, 0, 0);
    await sleep(300);
    bot.currentWindow.requiresConfirmation = false;
    bot.clickWindow(10, 0, 0);
    await sleep(50);
  }
  async function claimSold() {
    bot.chat('/ah');
    await sleep(300);
    if (getWindowName(bot.currentWindow).includes('Auction House')) {
      bot.currentWindow.requiresConfirmation = false;
      bot.clickWindow(15, 0, 0);
      await sleep(300);
      if (getWindowName(bot.currentWindow).includes('Manage Auctions')) {
        bot.currentWindow.requiresConfirmation = false;
        const items = bot.currentWindow?.slots;
        items.forEach((item, index) => {
          if (!item) return;
          const name = item?.value?.display?.value?.Name?.value?.toString();
          if (name?.includes('Claim')) {
            bot.clickWindow(index, 0, 0);
            sleep(50);
            return;
          }
        });
        items.forEach((item, index) => {
          if (!item) return;
          const lore = item.nbt.value?.display?.value?.Lore?.value?.value?.toString();
          if (lore?.includes('Sold!')) {
            bot.clickWindow(index, 0, 0);
          }
        });
      } else {
        console.error(`Didn't properly claim sold auction not finding Manage auctions. Found ${getWindowName(bot.currentWindow)}`);
      }
    } else {
      console.error(`Didn't properly claim sold auction not finding Auction House. Found ${getWindowName(bot.currentWindow)}`);
    }
    return;
  }
  ws.on('flip', async msg => {
    let bed = '[NUGGET]';
    const data = JSON.parse(msg.data);
    let itemName;
    let auctionID;
    let currentTime = Date.now();
    if (usingBaf) {
      if (!bot.state && currentTime - lastAction > delay) {
        auctionID = data.id;
        packets.sendMessage(`/viewauction ${auctionID}`);
        itemName = data.itemName.replace('!', '').replace('-us', '').replace('.', '');
        lastAction = currentTime;
        logmc(`§6[§bTPM§6] §8Opening ${itemName}`);
        currentOpen = data.id;
      } else {
        auctionID = data.id;
        itemName = data.itemName.replace('!', '').replace('-us', '').replace('.', '');
        logmc(`§6[§bTPM§6] §aAdding ${itemName}§3 to the pipeline because state is ${bot.state}!`);
        stateManger.add(`/viewauction ${auctionID}`, Infinity, 'buying');
      }
      const ending = new Date(normalizeDate(data.purchaseAt)).getTime();
      webhookPricing[noColorCodes(itemName)] = {
        target: data.target,
        price: data.startingBid,
        auctionId: auctionID,
        bed: bed,
        finder: data.finder,
      };
      if (currentTime < ending) {
        bed = '[BED]';
        webhookPricing[noColorCodes(itemName)].bed = bed;
        //console.log(`bed found, waiting ${ending - Date.now() - waittime} ending: ${ending}`);
        setTimeout(async () => {
          for (i = 0; i < 4; i++) {
            if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
              bot.clickWindow(31, 0, 0);
              //console.log(`Clicking bed`);
              await sleep(3);
            }
          }
        }, ending - Date.now() - waittime);
        setTimeout(() => {
          if (getWindowName(bot.currentWindow)?.includes('BIN Auction View') && currentOpen === auctionID) {
            bot.closeWindow(bot.currentWindow);
            bot.state = null;
            logmc(`§6[§bTPM§6] §cBed timing failed and we had to abort the auction :(`);
          }
        }, 5000);
      }
    } else {
      if (!bot.state && currentTime - lastAction > delay) {
        auctionID = data.id;
        packets.sendMessage(`/viewauction ${auctionID}`);
        itemName = data.auction.itemName;
        //console.log(`Opening ${itemName} at ${Date.now()}`);
        logmc(`§6[§bTPM§6] §8Opening ${itemName}`);
        lastAction = currentTime;
        currentOpen = auctionID;
      } else {
        auctionID = data.id;
        itemName = data.auction.itemName;
        logmc(`§3Adding ${itemName}§3 to the pipeline because state is ${bot.state}!`);
        stateManger.add(`/viewauction ${auctionID}`, Infinity, 'buying');
      }
      const ending = new Date(normalizeDate(data.auction.start)).getTime() + 20000;
      webhookPricing[noColorCodes(itemName)] = {
        target: data.target,
        price: data.auction.startingBid,
        auctionId: auctionID,
        bed: bed,
        finder: data.finder,
      };
      if (currentTime < ending) {
        bed = '[BED]';
        webhookPricing[noColorCodes(itemName)].bed = bed;
        //console.log(`bed found, waiting ${ending - Date.now() - waittime} ending: ${ending}`);
        setTimeout(async () => {
          for (i = 0; i < 5; i++) {
            if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
              bot.clickWindow(31, 0, 0);
              await sleep(3);
            }
          }
        }, ending - currentTime - waittime);
        setTimeout(() => {
          if (getWindowName(bot.currentWindow)?.includes('BIN Auction View') && currentOpen === auctionID) {
            bot.closeWindow(bot.currentWindow);
            bot.state = null;
            logmc(`§6[§bTPM§6] §cBed timing failed and we had to abort the auction :(`);
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
  });
  setInterval(() => {
    //BED SPAM
    if (!bedSpam) return;
    if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
      const item = bot.currentWindow?.slots[31]?.name;
      if (item?.includes('bed')) {
        bot.currentWindow.requiresConfirmation = false;
        bot.clickWindow(31, 0, 0);
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
          })
        );
      }
    }, 5500);
  }
  ws.on('open', sendScoreboard);
  const settings = msg => {
    privacySettings = new RegExp(msg.chatRegex);
    ws.off('settings', settings);
  };
  ws.on('settings', settings);
  bot.on('chat', (username, message, type) => {
    if (!privacySettings) return;
    if (type === 'chat') {
      const msg = message.getText(null);
      if (privacySettings.text(msg)) {
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
      })
    );
  };
  ws.on('getInventory', sendInventoy);
  bot.on('windowOpen', sendInventoy);
}
start();
