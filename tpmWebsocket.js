const WebSocket = require('ws');
const { config } = require('./config.js');
const { solveCaptcha } = require('./websocketHelper.js');
const { logmc, error } = require('./logger.js');
const { sendPingStats, noColorCodes } = require('./utils.js');
const { ws } = require(`./websocketHelper.js`);
const { Webhook, MessageBuilder } = require('discord-webhook-node');

let webhook = config.webhook;
let bot, handleCommand, bought = 0, sold = 0;
let sentWsMessage = false;
let tws = null;
let reconnecting = false;
const uuid = config.uuid;
const discordID = config.discordID;
const ign = config.username;
const private = config.keepEverythingPrivate
let settings = null;

if (webhook) {
    webhook = new Webhook(webhook);
    webhook.setUsername('TPM');
    webhook.setAvatar('https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless');
}
function makeTpmWebsocket() {
    try {
        if (tws) {
            tws.removeAllListeners();
            tws.close();
        }

        reconnecting = false;
        tws = new WebSocket('ws://107.152.36.217:1241');//just a random vps btw
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
                case "command":
                    let messageList = [];
                    let started = Date.now()
                    const get10Messages = (message) => {
                        messageList.push(message)
                        if (messageList.length == 10 || Date.now() - started > 10_000) {
                            ws.off('messageText', get10Messages);
                            if (webhook) {
                                const embed = new MessageBuilder()
                                    .setFooter(`The "Perfect" Macro`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                                    .setTitle(`Last ${messageList.length} messages`)
                                    .addField(`Ran command /cofl ${data.message.replace('/cofl ', '')}`, noColorCodes(messageList.join('\n')))
                                    .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                                webhook.send(embed)
                            }
                        }
                    }
                    handleCommand(`/cofl ${data.message.replace('/cofl ', '')}`);
                    ws.on('messageText', get10Messages)
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

module.exports = { sendFlip, giveTheFunStuff, updateSold };
