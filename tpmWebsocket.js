const WebSocket = require('ws');
const { config } = require('./config.js');
const { solveCaptcha } = require('./websocketHelper.js');
const { logmc, error } = require('./logger.js');
const { sendPingStats } = require('./utils.js');
const { ws } = require(`./websocketHelper.js`);

let bot, handleCommand, bought = 0, sold = 0;
let sentWsMessage = false;
let tws = null;
let reconnecting = false;
const uuid = config.uuid;
const discordID = config.discordID;
const ign = config.username;

function makeTpmWebsocket() {
    try {
        if (tws) {
            tws.removeAllListeners();
            tws.close();
        }

        reconnecting = false;
        tws = new WebSocket('ws://107.152.36.217:1241');//just a random vps btw

        tws.on('open', () => {
            logmc('§6[§bTPM§6] §3Connected to the TPM websocket!');
            sentWsMessage = false;
            setTimeout(() => {
                tws.send(JSON.stringify({
                    type: "loggedIn",
                    data: JSON.stringify({
                        discordID: discordID,
                        webhook: config.webhook
                    })
                }));
            }, 5000);
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

function sendFlip(auctionId, profit, price, bed, name) {
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
                auctionId: auctionId
            })
        }));
    }
}

function updateSold() {
    sold++;
}

function giveTheFunStuff(BOT, handleThoseCommands) {
    bot = BOT;
    handleCommand = handleThoseCommands;
}

module.exports = { sendFlip, giveTheFunStuff, updateSold };
