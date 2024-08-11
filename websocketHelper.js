const EventEmitter = require('events');
const { logmc, debug, error } = require("./logger.js");
const { sleep, formatNumber, noColorCodes } = require("./utils.js");
const axios = require('axios');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
let { config, updateConfig } = require('./config.js');
let webhook;
let id = config.discordID;
const ws = new EventEmitter();
let connected = false;
const WebSocket = require('ws');
let websocket = false;
let sidStep = 1;
let captchaSolves = [];
let ping = "";
if (id) ping = `<@${id}>`;
async function startWS(sid) {
    if (config) {
        const webhookURL = config.webhook;
        webhook = webhookURL ? new Webhook(webhookURL) : false;
        if (webhook) {
            webhook.setUsername('TPM');
            webhook.setAvatar('https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless')
        }
        id = config.discordID;
    }
    const link = `${config.usInstance ? 'ws://sky-us.' : 'wss://sky.'}coflnet.com/modsocket?version=${config.useBafSocket ? '1.5.0-af' : '1.5.5-Alpha'}&player=${config.username}&SId=${sid}`;
    debug(`Connecting to ${link}`)
    websocket = new WebSocket(link);
    websocket.on('open', () => {
        logmc('§aConnected to WebSocket server');
        if (webhook) {
            const embed = new MessageBuilder()
                .setFooter(`The "Perfect" Macro - BETA 1.1.5`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
                .setTitle('Started flipping')
                .addField('', `Logged in as \`${config.username}\``)
                .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
                .setColor(16760576);
            webhook.send(embed);
        }
        /*setTimeout(() => {
            handleCommand('/cofl flip false');
            setTimeout(() => {
                handleCommand('/cofl flip true');
            }, 3000)
        }, 3000)*/
        connected = true;
        ws.emit('open', '')
    });

    websocket.on('message', (message) => {
        const text = parseMessage(message, config.useBaf);
        checkCaptchaSolution(message);
        if (!checkCaptcha(message)) {
            logmc(text);
        }
    });

    websocket.on('close', async () => {
        connected = false;
        logmc('§cDisconnected from WebSocket server');
        await sleep(5000);
        if (!connected) startWS(sid);
    });

    websocket.on('error', (err) => {
        error('WebSocket error:', err.message);
        websocket.close();
    });
}
function parseMessage(message) {
    const msg = JSON.parse(message);
    //console.log(JSON.stringify(msg));
    if (!msg || !msg.type) return;
    let text;
    if (msg.data) var fr = JSON.parse(msg.data)
    switch (msg.type) {
        case "flip":
            ws.emit("flip", msg);
            if (!config.useBafSocket) {
                text = fr.messages.map(obj => obj.text).join(' ');
            } else {
                text = `§6[§bTPM§6] §eTrying to purchase ${fr.itemName}§e for ${formatNumber(fr.startingBid)} §7(target ${formatNumber(fr.target)})`
            }
            return text;
        case "chatMessage":
            ws.emit("message", msg)
            if (Array.isArray(fr)) {
                text = fr.map(obj => obj.text).join(' ');
            } else if (fr.text) {
                text = fr.text;
            }
            ws.emit("messageText", text);
            return text;
        case "writeToChat":
            ws.emit("message", msg)
            if (Array.isArray(fr)) {
                text = fr.map(obj => obj.text).join(' ');
            } else if (fr.text) {
                text = fr.text;
            }
            ws.emit("messageText", text);
            return text;
        case "execute":
            let execData = msg.data
            if (execData.includes('/cofl ping')) {
                let dataParts = execData.slice(1, -1).split(' ');
                dataParts.shift();
                dataParts.shift();
                dataParts = '"' + dataParts.join(' ') + '"';
                send(JSON.stringify({ type: 'ping', data: dataParts }));
            } else {
                handleCommand(execData)
            }
            break;
        case "loggedIn":
        case "playSound":
        case "ping":
        case "countdown":
        case "createAuction":
            break;
        case "getInventory":
            ws.emit('getInventory', msg);
            break;
        case "privacySettings":
            ws.emit('settings', msg);
            handleCommand(`/cofl flip always`)
            //handleCommand('/cofl get json');
            /*setTimeout(() => {
                handleCommand('/cofl flip always');
            }, 7500)*/
            break;
        default:
            return `Message ${JSON.stringify(msg)}`;
    }
    return;
}
function send(msg, type = true) {
    if (!websocket || !connected) {
        if (type) logmc(`§6[§bTPM§6] §cCan't send to websocket because not connected`);
        return;
    }
    websocket.send(msg)
}
function handleCommand(command) {
    const args = command.split(' ');
    const first = args[1];
    args.shift();
    args.shift();
    send(
        JSON.stringify({
            type: first,
            data: `"${args.join(' ')}"`
        })
    )
}
function sidListener(newConfig) {
    //console.log(`Sid listener go go go`);
    const onMessage = (message) => {
        //console.log(JSON.stringify(message));
        if (!message.data) return;
        const data = JSON.parse(message.data);
        if (sidStep === 1) {
            if (!data[1]?.text) return;
            const important = noColorCodes(data[1].text);
            if (important.includes('Please click this [LINK]')) {
                logmc(`§6[§bTPM§6] §9Use ${data[1].onClick} to log in!`);
                //console.log(`Found reg socket login`)
                sidStep++;
                ws.on('settings', loggedIn)
                ws.off('message', onMessage)
                handleCommand('/cofl flip false');
            } else if (important.includes('Please click') && important.includes('to login')) {
                sidStep++;
                //console.log(`Found baf socket login`)
                ws.on('settings', loggedIn);
                ws.off('message', onMessage);
                handleCommand('/cofl s maxItemsInInventory 1');
            }
        }
    };
    const loggedIn = () => {
        //console.log(`Logged in found`);
        if (sidStep === 2) {
            updateConfig(newConfig)
            ws.off('settings', loggedIn);
        }
    }
    ws.on('message', onMessage);
}

function checkCaptcha(thingy) {
    const parse = JSON.parse(thingy);
    //console.log(JSON.stringify(parse));
    if (parse.type !== 'chatMessage') return false;
    parse.data = JSON.parse(parse.data);
    const prettyJsonString = JSON.stringify(parse, null, 2);
    if (prettyJsonString.indexOf('/cofl captcha') !== -1 && !prettyJsonString.includes('You are currently delayed for likely being afk.') && !prettyJsonString.includes('is not known.') && !prettyJsonString.includes('[§1C§6hat§f]')) {
        sendCaptcha(parse)
        return true;
    }
    return false;
}

function sendCaptcha(message) {
    let finished = [];
    const data = message.data;
    let i = 1;
    captchaSolves = [];
    data.forEach((msg, index) => {
        const text = msg.text;
        if (text === "\n") {
            finished.push(`| ${i}`);
            i++
            captchaSolves.push(data[index - 6]?.onClick?.replace('/cofl captcha ', ''))
        }
        finished.push(text.replace(/[\uD83C\uDDE7\uD83C\uDDFE]/g, '').replace(/§./g, ''));
    })
    console.log(finished.join(''));
    if (webhook) A(finished.join(''));
}

function A(finished) {
    try {
        axios.post(config.webhook, {
            username: "TPM",
            avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
            content: ping,
            embeds: [{
                title: 'Captcha',
                color: 65280,
                description: `\`\`\`\n${finished}\n\`\`\``,
            }]
        })
    } catch (e) {
        console.error(`Failed captcha sending ${e}`)
    }
}

function solveCaptcha(line) {
    const captchaCode = parseInt(line);
    if (isNaN(captchaCode)) {
        if (line?.toLowerCase() == 'new') {
            handleCommand(`icymacro captcha`);
        } else {
            logmc(`§cThat's not a number!`);
        }
        return;
    }
    const solution = captchaSolves[captchaCode - 1];
    if (solution) {
        handleCommand(`icymacro captcha ${solution}`);
        logmc(`§6Using the ${line} line`)
    } else {
        logmc('§cPlease provide a captcha code.');
    }
}

function checkCaptchaSolution(message) {
    const msg = JSON.parse(message);
    if (msg.type === "writeToChat") {
        const data = JSON.parse(msg.data);
        if (data.text.includes('Thanks for confirming that you are a real user')) {
            const embed = new MessageBuilder()
            .setFooter(`The "Perfect" Macro - BETA 1.1.5`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
            .setTitle('Solved the captcha')
            .addField('', `Lmao they thought you were real`)
            .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
            .setColor(5294200);
        webhook.send(embed);
        } else if (data.text.includes("solved the captcha, but")) {
            const embed = new MessageBuilder()
            .setFooter(`The "Perfect" Macro - BETA 1.1.5`, 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437')
            .setTitle('Solved the captcha')
            .addField('', `Sadly there are more captchas`)
            .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
            .setColor(15335387);
        webhook.send(embed);
        }
    }
}


module.exports = { startWS, ws, send, sidListener, handleCommand, solveCaptcha }