const WebSocket = require('ws');
const { config } = require('./config.js');
const { solveCaptcha } = require('./websocketHelper.js');
const { logmc, error } = require('./logger.js');
const { sendPingStats, noColorCodes, sendDiscord, getStats } = require('./utils.js');
const { ws } = require(`./websocketHelper.js`);
const { MessageBuilder } = require('discord-webhook-node');

let bot, handleCommand, bought = 0, sold = 0;
let sentWsMessage = false;
let tws = null;
let reconnecting = false;
const uuid = config.uuid;
const discordID = config.discordID;
const ign = config.username;
const private = config.keepEverythingPrivate
let settings = null;
let profitList = [];
let mostRecentFlip = Date.now();

function makeTpmWebsocket() {
    try {
        if (tws) {
            tws.removeAllListeners();
            tws.close();
        }

        reconnecting = false;
        tws = new WebSocket('ws://107.152.38.30:1241');//just a random vps btw
        //sex
        tws.on('open', () => {
            logmc('§6[§bTPM§6] §3Connected to the TPM websocket!');
            sentWsMessage = false;
            setTimeout(() => {
                if (!settings && !private) {
                    getSettings();
                }
                tws.send(JSON.stringify({
                    type: "loggedIn",
                    data: JSON.stringify({
                        discordID: discordID,
                        webhook: config.webhook,
                        private: private,
                        userName: config.username,
                        settings: settings
                    })
                }));
            }, 500);
        });

        tws.on('message', (message) => {
            //debug(message.toString());
            const msg = JSON.parse(message);
            const data = JSON.parse(msg.data);
            switch (msg.type) {
                case "captcha":
                    solveCaptcha(data.line);
                    logmc(`§6[§bTPM§6] §3Solving a captcha from discord by user ${data.user}`);
                    break;
                case "stats":
                    sendPingStats(ws, handleCommand, bot, sold, bought);
                    break;
                case "allStats":
                    getStats(ws, handleCommand, bot, sold, profitList);
                    break;
                case "command":
                    let messageList = [];
                    let started = Date.now()
                    const get10Messages = (message) => {
                        messageList.push(message)
                        if (messageList.length == 10 || Date.now() - started > 10_000) {
                            ws.off('messageText', get10Messages);
                            const embed = new MessageBuilder()
                                .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                                .setTitle(`Last ${messageList.length} messages`)
                                .addField(`Ran command /cofl ${data.message.replace('/cofl ', '')}`, noColorCodes(messageList.join('\n') || "got nothing :("))
                                .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                                .setColor(0);
                            sendDiscord(embed);
                        }
                    }
                    handleCommand(`/cofl ${data.message.replace('/cofl ', '')}`);
                    ws.on('messageText', get10Messages);
                    break;
                case "timeout":
                    const time = data.timeout;
                    const embed = new MessageBuilder()
                        .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                        .setTitle(`Timeout`)
                        .addField(``, `Your macro will stop <t:${Math.round(Date.now() / 1000) + time * 3_600}:R>`)
                        .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                        .setColor(2615974);
                    sendDiscord(embed);
                    setTimeout(async () => {
                        const embed2 = new MessageBuilder()
                            .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                            .setTitle(`Stopping your macro!!!`)
                            .addField(``, "It's your timeout!")
                            .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                            .setColor(15755110);
                        sendDiscord(embed2);
                        setTimeout(() => {
                            setInterval(() => {
                                if (Date.now() - mostRecentFlip > 25000 && (Date.now() - mostRecentFlip) % 60_000 < 50000) {
                                    process.exit(1);
                                }
                            }, 5)
                        }, 1500)
                    }, time * 3_600_000)
            }
        });

        tws.on('close', () => {
            if (!reconnecting) {
                reconnecting = true;
                setTimeout(() => {
                    makeTpmWebsocket();
                }, 60_000);
            }
        });

        tws.on('error', (err) => {
            if (!sentWsMessage) {
                error(`The TPM websocket is currently down :( Please tell icyhenryt!`);
            }
            if (!reconnecting) {
                reconnecting = true;
                sentWsMessage = true;
                setTimeout(() => {
                    makeTpmWebsocket();
                }, 60_000);
            }
        });

    } catch (e) {
        if (!reconnecting) {
            reconnecting = true;
            if (!sentWsMessage) {
                error(`The TPM websocket is currently down :( Please tell icyhenryt!`);
            }
            sentWsMessage = true;
            setTimeout(() => {
                makeTpmWebsocket();
            }, 60_000);
        }
    }
}

makeTpmWebsocket();

function sendFlip(auctionId, profit, price, bed, name, finder, buyspeed) {
    bought++;
    profitList.push(profit);
    if (tws && tws.readyState === WebSocket.OPEN) {
        tws.send(JSON.stringify({
            type: "flip",
            data: JSON.stringify({
                user: ign,
                bed: bed,
                flip: name,
                price: price,
                profit: profit,
                uuid: uuid,
                auctionId: auctionId,
                finder: finder,
                buyspeed: buyspeed
            })
        }));
    }
}

function getSettings() {
    if (private) return;
    const gettingSettings = (msg) => {
        settings = msg;
        if (tws && tws.readyState === WebSocket.OPEN) {
            tws.send(JSON.stringify({
                type: "settings",
                data: JSON.stringify({
                    settings: settings
                })
            }));
        }
        ws.off('jsonSettings', gettingSettings);
    }
    ws.on('jsonSettings', gettingSettings);
}

getSettings()

function updateSold() {
    sold++;
}

function giveTheFunStuff(BOT, handleThoseCommands) {
    bot = BOT;
    handleCommand = handleThoseCommands;
}

function sendFlipFound(auctionID) {//Allows for winrate
    mostRecentFlip = Date.now();
    if (private) return;
    if (tws && tws.readyState === WebSocket.OPEN) {
        tws.send(JSON.stringify({
            type: "flipFound",
            data: JSON.stringify({
                id: auctionID
            })
        }));
    }
}

module.exports = { sendFlip, giveTheFunStuff, updateSold, sendFlipFound };
