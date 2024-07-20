// consts
const mineflayer = require('mineflayer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const registry = require('prismarine-registry')('1.8.9')
const ChatMessage = require('prismarine-chat')(registry)
const config = require('./config.json');
const { check, Window } = require('./window.js');
const utils = require(`./utils.js`);
const { randomUUID } = require('crypto');
const session = require('./session.json');
const axios = require('axios');
const stateManger = require(`./state.js`);
const { noColorCodes, onlyNumbers, normalizeDate, IHATETAXES, formatNumber, sleep, getWindowName, saveData } = require('./utils.js')
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { getPackets, makePackets } = require('./packetStuff.js');
const { logmc } = require('./logger.js');
var prompt = require('prompt-sync')()
const { startWS, send, handleCommand, ws, sidListener, solveCaptcha } = require('./websocketHelper.js');
let lastAction = 0;
const webhookURL = config.webhook;
const webhook = webhookURL ? new Webhook(config.webhook) : false;
if (webhook) {
  webhook.setUsername('TPM');
  webhook.setAvatar('https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless')
}
webhookPricing = {};
let spawned = false;
let ign = session.ign;
let sid = session.sid;
let terms = session.terms;
let privacySettings;
if (!terms) {
  prompt(`BY CLICKING ENTER YOU AGREE THAT IT'S NOT ICYHENRYT'S FAULT IF YOU'RE BANNED BECAUSE IT'S IN BETA`);
  session.terms = true
  saveData('', 'session', session);
}
let usingBaf = config.useBaf;
let delay = config.delay;
let waittime = config.waittime;
let lastGui = 0;

function testign() {
  if (!ign) {
    ign = prompt(`What's your IGN (caps matter) ?`);
    if (ign) {
      session.ign = ign;
      saveData('', 'session', session);
    } else {
      console.log(`So close! You need to have a username`);
      testign();
    }
  }
}
testign();

if (!sid) {
  sid = randomUUID();
  session.sid = sid;
  sidListener(session, sid);
}

// start bot
async function start() {
  let uuid = session.uuid;
  if (!uuid) {
    axios.get(`https://api.mojang.com/users/profiles/minecraft/${ign}`)
      .then(response => {
        uuid = response.data.id;
        session.uuid = uuid;
        saveData('', 'session', session);
      })
      .catch(error => {
        console.error('Error fetching UUID:', error);
      });
  }
  startWS(sid);
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
    host: 'play.hypixel.net'
  })
  console.log(bot.uuid)
  await makePackets(bot._client);
  const packets = getPackets();
  bot.state = 'moving';
  let firstGui;
  Window.on('newWindow', async (window) => {
    bot.currentWindow.requiresConfirmation = false;
    const name = getWindowName(window);
    console.log(`NEW ${name} found at ${Date.now()}`);
    lastGui = Date.now();
    if (name === "BIN Auction View") {
      bot.clickWindow(31, 0, 0)
      bot.state = 'buying';
      firstGui = lastGui
      await sleep(6);
      const item = bot.currentWindow?.slots[31]?.name;
      console.log(`Found ${item} in slot 31`);
      switch (item) {
        case "poisonous_potato":
          bot.closeWindow(bot.currentWindow);
          bot.state = null;
          break;
        case "bed":
          console.log('Bed found! Waiting aaa');
          break;
        case "potato":
          bot.closeWindow(bot.currentWindow);
          bot.state = null;
          break;
        case "feather":
          bot.closeWindow(bot.currentWindow);
          bot.state = null;
          break;
        case "gold_block":
          bot.state = null;
          break;
      }
    }
    if (name === "Confirm Purchase") {
      bot.clickWindow(11, 0, 0)
      console.log(`Confirm at ${Date.now() - firstGui}`);
      bot.state = null;
    }
  });
  setInterval(() => {//Custom window handler
    check(bot);
  }, 1)
  let old = bot.state;
  setInterval(() => {//Queue
    const current = stateManger.get();
    if (bot.state !== old) console.log(`Bot state updated: ${bot.state}`);
    old = bot.state;
    //if(!current) console.log(`Current is null :(`);
    if (current && bot.state === null && Date.now() - lastAction > delay) {
      bot.state = current.state;
      const command = current.command;
      if (command === 'claim') {
        claimBought();
      } else if (command === 'sold') {
        claimSold();
      } else {
        bot.chat(command);
      }
      stateManger.next();
      lastAction = Date.now();
      console.log(`Turning state into ${bot.state} and running ${current.command}`);
    }
  }, 1)
  bot.once('spawn', async () => {//Auto join SB
    await bot.waitForChunksToLoad();
    spawned = true;
    await sleep(5000);
    bot.state = 'moving';
    bot.chat('/play sb');
    await sleep(5000);
    bot.chat('/is');
  })
  bot.on('error', (e) => {// error :(
    console.log(e)
  });
  setInterval(() => {
    if (!spawned) return;
    const board = bot.scoreboard?.sidebar?.items;
    if (!board) {
      bot.chat('/l');
      return;
    }
    let scoreboard = bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, ''))
    scoreboard.forEach(line => {
      if (line.includes("Village")) {
        bot.state = 'moving'
        bot.chat('/is')
      }
      if (line.includes("Rank:")) {
        bot.state = 'moving'
        bot.chat('/play sb')
      }
      if (line.includes("bugs")) {
        bot.state = 'moving'
        bot.chat('/play sb')
      }
      if (line.includes('Your Island')) {
        if (bot.state === 'moving') bot.state = null;
      }
    })
  }, 5000)
  bot.on('login', () => {
    console.log('Logged in');
    bot.chat('/locraw');
  });
  bot.on('message', async (message, type) => {
    try {
      if (type !== 'chat') return;
      const text = JSON.parse(message);

      if (text.map.includes("Private Island")) {
        if (bot.state === "moving") bot.state = null;
      } else {
        bot.state = 'moving'
      }
    } catch (e) {
      return;
    }
  })
  bot.on('disconnect', () => {
    console.log("left server maybe idk does this work? I can't find docs");
    bot.state = 'moving'
  })
  bot.on('message', async (message, type) => {
    let text = message.getText(null);
    const msg = new ChatMessage(message);
    if (type === 'chat') {
      console.log(message.toAnsi());
    }
    switch (text) {
      case "Putting coins in escrow...":
        console.log(`Auction bought in ${Date.now() - firstGui}ms`);
        bot.state = null;
        break;
      case "This auction wasn't found!":
        bot.state = null;
        break;
      case "You don't have enough coins to afford this bid!":
        console.log(`Poor lmao`);
        bot.state = null;
        break;
      case "/limbo for more information.":
        await sleep(5000);
        bot.state = 'moving';
        bot.chat('/lobby');
      case "You may only use this command after 4s on the server!":
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
      console.log(`Found ${item} with ${price}`);
      if (!webhookPricing[item]) {
        console.log(`Didn't find ${item} in ${JSON.stringify(webhookPricing)}`)
        return;
      }
      const itemBed = webhookPricing[item].bed;
      const auctionUrl = `https://sky.coflnet.com/auction/${webhookPricing[item].auctionId}`;
      const profit = utils.IHATETAXES(webhookPricing[item].target) - utils.onlyNumbers(price)
      if (webhook) {
        const embed = new MessageBuilder()
          .setFooter(`The "Perfect" Macro - Found by ${webhookPricing[item].finder}`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
          .setTitle('Item purchased')
          .addField('', `Bought \`${item}\` for \`${price} coins\` (\`${utils.formatNumber(profit)}\` profit) [click](${auctionUrl}) ${itemBed}`)
          .setThumbnail(`https://mc-heads.net/head/${session.uuid}.png`)
          .setColor(2615974)
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
      }, 500)
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
          .setThumbnail(`https://mc-heads.net/head/${session.uuid}.png`)
          .setColor(16731310)
        webhook.send(embed);
      }
      sendScoreboard()
      setTimeout(async () => {
        if (bot.state === null) {
          bot.state = 'claiming';
          await claimSold();
          bot.state = null;
        } else {
          stateManger.add('sold', Infinity, 'claiming');
        }
      }, 500)
    }
  })
  function askUser() {
    rl.question('> ', (input) => {
      const args = input.trim().split(/\s+/);
      switch (args[0]) {
        case "chat":
          const message = args.slice(1).join(' ');
          packets.sendMessage(message);
          console.log(`sending ${message} ${Date.now()}`);
          break;
        case "/cofl":
        case "/icymacro":
          handleCommand(input);
          break;
        case "!c":
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
        const items = bot.currentWindow?.slots
        items.forEach((item, index) => {
          if (!item) return;
          const name = item?.value?.display?.value?.Name?.value?.toString()
          if (name?.includes('Claim')) {
            bot.clickWindow(index, 0, 0);
            sleep(50);
            return;
          }
        })
        items.forEach((item, index) => {
          if (!item) return;
          const lore = item.nbt.value?.display?.value?.Lore?.value?.value?.toString()
          if (lore?.includes('Sold!')) {
            console.log(`Found sold item in slot ${index}!`)
            bot.clickWindow(index, 0, 0)
          }
        })
      } else {
        console.error(`Didn't properly claim sold auction not finding Manage auctions`);
      }
    } else {
      console.error(`Didn't properly claim sold auction not finding Auction House`);
    }
    return;
  }
  ws.on('flip', async msg => {
    console.log(`Found a flip at ${Date.now()}`);
    let bed = '[NUGGET]';
    const data = JSON.parse(msg.data)
    let itemName;
    let auctionID;
    let currentTime = Date.now();
    if (usingBaf) {
      if (!bot.state && currentTime - lastAction > delay) {
        auctionID = data.id;
        packets.sendMessage(`/viewauction ${auctionID}`);
        itemName = data.itemName.replace('!', '').replace('-us', '').replace('.', '');
        console.log(`Opening ${itemName} at ${Date.now()}`);
        logmc(`Opening ${itemName}`)
        currentOpen = data.id;
      } else {
        auctionID = data.id;
        itemName = data.itemName.replace('!', '').replace('-us', '').replace('.', '');
        logmc(`§3Adding ${itemName}§3 to the pipeline because state is ${bot.state}!`);
        stateManger.add(`/viewauction ${auctionID}`, Infinity, 'buying');
      }
      const ending = new Date(normalizeDate(data.purchaseAt)).getTime();
      webhookPricing[noColorCodes(itemName)] = {
        target: data.target,
        price: data.startingBid,
        auctionId: auctionID,
        bed: bed,
        finder: data.finder
      }
      if (currentTime < ending) {
        bed = '[BED]'
        webhookPricing[noColorCodes(itemName)].bed = bed;
        console.log(`bed found, waiting ${ending - Date.now() - waittime} ending: ${ending}`)
        setTimeout(async () => {
          for (i = 0; i < 4; i++) {
            if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
              bot.clickWindow(31, 0, 0);
              console.log(`Clicking bed`)
              await sleep(3);
            }
          }
        }, ending - Date.now() - waittime);
        setTimeout(() => {
          if (getWindowName(bot.currentWindow)?.includes('BIN Auction View') && currentOpen === auctionID) {
            bot.closeWindow(bot.currentWindow);
            bot.state = null;
            logmc(`§3Bed timing failed and we had to abort the auction :(`)
          }
        }, 5000)
      } else {
        console.log(`Nugget found`);
      }
    } else {
      if (!bot.state && currentTime - lastAction > delay) {
        auctionID = data.id;
        packets.sendMessage(`/viewauction ${auctionID}`);
        itemName = data.auction.itemName;
        console.log(`Opening ${itemName} at ${Date.now()}`);
        logmc(`Opening ${itemName}`)
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
        finder: data.finder
      }
      if (currentTime < ending) {
        bed = '[BED]'
        webhookPricing[noColorCodes(itemName)].bed = bed;
        console.log(`bed found, waiting ${ending - Date.now() - waittime} ending: ${ending}`)
        setTimeout(async () => {
          for (i = 0; i < 5; i++) {
            if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
              bot.clickWindow(31, 0, 0);
              console.log(`Clicking bed`)
              await sleep(3);
            }
          }
        }, ending - currentTime - waittime);
        setTimeout(() => {
          if (getWindowName(bot.currentWindow)?.includes('BIN Auction View') && currentOpen === auctionID) {
            bot.closeWindow(bot.currentWindow);
            bot.state = null;
            logmc(`§3Bed timing failed and we had to abort the auction :(`);
          }
        }, 5000)
      }
    }
  })
  setInterval(() => {//stuck failsafe
    if (bot.state && Date.now() - lastGui > 30000 && getWindowName(bot.currentWindow)) {
      logmc(`§cGot stuck :( `);
      bot.closeWindow(bot.currentWindow);
      bot.state = null;
    }
  }, 50)
  setInterval(() => {//BED SPAM
    if (!config.bedSpam) return;
    if (getWindowName(bot.currentWindow)?.includes('BIN Auction View')) {
      const item = bot.currentWindow?.slots[31]?.name;
      if (item?.includes('bed')) {
        bot.currentWindow.requiresConfirmation = false;
        bot.clickWindow(31, 0, 0);
      }
    }
  }, config.clickDelay);
  /*setInterval(() => {//better autobuy maybe
    switch (getWindowName(bot.currentWindow)) {
      case "BIN Auction View":
        bot.clickWindow(31, 0, 0);
        break;
      case "Confirm Purchase":
        bot.clickWindow(11, 0, 0);
        bot.closeWindow(bot.currentWindow);
        break;
    }
  }, 1)*/
  ws.on('open', sendScoreboard);
  function sendScoreboard() {
    setTimeout(() => {
      if (!bot?.scoreboard?.sidebar?.items) return;
      if (bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, '')).find(e => e.includes('Purse:') || e.includes('Piggy:'))) {
        send(
          JSON.stringify({
            type: 'uploadScoreboard',
            data: JSON.stringify(bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, '')))
          })
        )
      }
    }, 5500)
  }
  const settings = (msg) => {
    privacySettings = new RegExp(msg.chatRegex);
    ws.off('settings', settings);
  }
  ws.on('settings', settings)
  bot.on('chat', (username, message, type) => {
    if (!privacySettings) return;
    if (type === 'chat') {
      const msg = message.getText(null)
      if (privacySettings.text(msg)) {
        send(JSON.stringify({
          type: "chatBatch",
          data: JSON.stringify([msg])
        }))
      }
    }
  })
  const sendInventoy = () => {
    send(JSON.stringify({
      type: 'uploadInventory',
      data: JSON.stringify(bot.inventory)
    }))
  }
  ws.on('getInventory', sendInventoy);
  bot.on('windowOpen', sendInventoy)
}
start();
