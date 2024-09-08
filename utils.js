const fs = require('fs');
const path = require('path');
const { debug, logmc, error } = require('./logger.js');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { config } = require('./config.js');
const { getPackets } = require('./packetStuff.js');
const axios = require('axios');

let tries = 0;
let webhook = config.webhook;
if (webhook && !Array.isArray(webhook)) {
    webhook = new Webhook(webhook);
    webhook.setUsername('TPM');
    webhook.setAvatar('https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless');
}

function noColorCodes(text) {
    return text.replace(/§./g, '').replace('§', '')//cofl sometimes sends messages that are cut off so I need the second one aswell
}
function onlyNumbers(text) {
    return parseInt(text.replace(/,/g, ''))
}
function IHATETAXES(price) {
    if (price < 10000000) {
        return price * .98
    } else if (price < 100000000) {
        return price * .97
    } else {
        return price * .965
    }
}
function formatNumber(num) {
    let negative = num < 0;
    num = Math.abs(num);
    let thingy;
    if (num >= 1000000000) {
        thingy = (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        thingy = (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        thingy = (num / 1000).toFixed(1) + 'K';
    } else {
        thingy = num.toString();
    }
    return `${negative ? '-' : ''}${thingy}`;
}
function getWindowName(window) {
    if (!window) return null;
    try {
        return JSON.parse(window.title).extra[0].text;
    } catch (e) {
        return null;
    }
}
function saveData(folder, name, data) {
    const jsonData = JSON.stringify(data, null, 2);
    const dirPath = path.join(__dirname, folder);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, `${name}.json`);
    fs.writeFile(filePath, jsonData, (err) => {
        if (err) {
            console.error(`Error writing data to ${filePath}: ${err}`);
        }
    });
}
function normalizeDate(dateString) {
    try {
        const isoFormatWithoutMillisUTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
        const isoFormatWithMillisUTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}Z$/;
        const isoFormatWithoutMillisOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2})$/;
        const isoFormatWithMillisOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}(?:[+-]\d{2}:\d{2})$/;

        if (isoFormatWithoutMillisUTC.test(dateString)) {
            // If the date string does not have milliseconds and ends with 'Z', add them
            return dateString.replace('Z', '.000Z');
        } else if (isoFormatWithMillisUTC.test(dateString)) {
            // Normalize milliseconds to three digits for 'Z'
            return dateString.replace(/(\.\d{1,2})Z$/, (match) => match.slice(0, -1).padEnd(4, '0') + 'Z');
        } else if (isoFormatWithoutMillisOffset.test(dateString)) {
            // If the date string does not have milliseconds and ends with offset, add them
            return dateString.replace(/([+-]\d{2}:\d{2})$/, '.000$1');
        } else if (isoFormatWithMillisOffset.test(dateString)) {
            // Normalize milliseconds to three digits for offset
            return dateString.replace(/(\.\d{1,2})([+-]\d{2}:\d{2})$/, (match, p1, p2) => p1.padEnd(4, '0') + p2);
        } else {
            throw new Error('Invalid date format');
        }
    } catch (error) {
        console.error(`Date normalization error: ${error.message} for ${dateString}`);
        return dateString; // Fallback to the original string
    }
}

function getPurse(bot) {
    return new Promise((resolve, reject) => {
        try {
            let pursey;
            let scoreboard = bot?.scoreboard?.sidebar?.items?.map(item => item?.displayName?.getText(null)?.replace(item.name, ''));
            scoreboard?.forEach(e => {
                if (e.includes('Purse:') || e.includes('Piggy:')) {
                    let purseString = e.substring(e.indexOf(':') + 1).trim();
                    debug(`Found purse line ${purseString}`)
                    if (purseString.includes('(')) purseString = purseString.split('(')[0];
                    pursey = parseInt(purseString.replace(/\D/g, ''), 10);
                }
            });
            resolve(pursey);
        } catch (error) {
            reject(error);
        }
    });
}

function relistCheck(currentlisted, totalslots, botstate) {
    //console.log(`listed ${currentlisted}, slots ${totalslots}, state ${botstate}`)
    if ((botstate == null || botstate == 'listing') && (currentlisted != totalslots)) {
        //console.log(`Current ah stuff your ah is at ${currentlisted} out of ${totalslots}`)
        return true
    }
    else if (botstate == "buying" || botstate == "listing" || botstate == "claiming" || botstate == "moving" || currentlisted == totalslots) {
        if (currentlisted == totalslots) {
            //ChatLib.chat(`Not relisting bc your ah is full at ${currentlisted} out of ${totalslots}`)
            //console.log("Not relisting bc your ah is full at", currentlisted, "out of", totalslots)
            return false
        } else if (botstate || botstate !== 'listing') {
            //console.log("Not relisting bc bot is in state", botstate)
            return false
        }
    } else {
        //console.log("No purchased AHIDs to relist");
        return false
    }
}

function addCommasToNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function nicerFinders(finder) {
    switch (finder) {
        case "USER":
            return "User";
        case "SNIPER_MEDIAN":
            return 'Median Sniper';
        case "TFM":
            return "TFM";
        case "AI":
            return 'AI';
        case "CraftCost":
            return "Craft Cost";
        case "SNIPER":
            return 'Sniper';
        case "STONKS":
            return 'Stonks';
        case "FLIPPER":
            return 'Flipper'
    }
    return finder;
}

async function betterOnce(listener, uhhh, timeframe = 5000) {
    return new Promise((resolve) => {
        let sent = false;

        const listen = () => {
            if (!sent) {
                sent = true;
                listener.off(uhhh, listen);
                resolve(true);
            }
        };

        setTimeout(() => {
            if (!sent) {
                listener.off(uhhh, listen);
                resolve(false);
            }
        }, timeframe);

        listener.on(uhhh, listen);
    });
}

async function checkHypixelPing(bot) {
    return new Promise((resolve, reject) => {
        let sent = false;
        bot.chat('/social pingwars');
        const pingwarsRegex = /Your Ping - ([\d,]+)ms/;
        const cooldownRegex = /You must wait to use social commands again!/;
        const badAtGame = /You do not have a high enough Social Skill to use this!/;
        const listen = (message, type) => {
            let text = noColorCodes(message.getText(null));
            if (type === 'chat') {

                const match = text.match(pingwarsRegex);
                if (match) {
                    bot.off('message', listen);
                    sent = true;
                    //console.log(`found ${match[1]}ms hypixel ping`);
                    resolve(`${match[1]}ms`);
                }
                if (text.match(cooldownRegex)) {
                    bot.off('message', listen);
                    sent = true;
                    //console.log(`found ${match[1]}ms hypixel ping`);
                    resolve(`Pingwars is on cooldown :(`);
                }
                if (text.match(badAtGame)) {
                    bot.off('message', listen);
                    sent = true;
                    //console.log(`found ${match[1]}ms hypixel ping`);
                    resolve(`You need social level 4 for this`);
                }

            }
        };
        setTimeout(() => {
            bot.off('message', listen);
            if (!sent) resolve(`Didn't get hypixel ping. Make sure you're social level 4`);
        }, 10000);
        bot.on('message', listen);
    });
}


async function checkCoflPing(ws, handleCommand) {
    return new Promise((resolve, reject) => {
        handleCommand('/cofl ping');
        let sent = false;
        const listen = (message) => {
            message = noColorCodes(message);
            debug(message);
            const pingRegex = /The time to receive flips is estimated to be ([\d.]+)ms/;
            const match = message.match(pingRegex);
            if (match) {
                ws.off('messageText', listen);
                sent = true;
                //console.log(`found ${match[1]}ms cofl ping`);
                resolve(`${match[1]}ms`);
            }
        };
        ws.on('messageText', listen);
        setTimeout(() => {
            ws.off('messageText', listen);
            if (!sent) resolve(`Didn't get cofl ping.`);
        }, 10000);
    });
}


async function checkCoflDelay(ws, handleCommand) {
    return new Promise((resolve, reject) => {
        handleCommand('/cofl delay');
        let sent = false;
        const listen = (message) => {
            message = noColorCodes(message);
            //error(message)
            const pingRegex = /You are currently delayed by ([\d.]+)s on api/;
            const match = message.match(pingRegex);
            if (match) {
                ws.off('messageText', listen);
                sent = true;
                //console.log(`found ${match[1]} delay`);
                resolve(`${match[1]}s`);
            }
            if (message.includes('You are currently not delayed at all')) {
                ws.off('messageText', listen);
                sent = true;
                //console.log(`found ${match[1]} delay`);
                resolve(`0s`);
            }
        };
        ws.on('messageText', listen);
        setTimeout(() => {
            ws.off('messageText', listen);
            if (!sent) resolve(`Didn't get cofl delay.`);
        }, 10000);
    });
}

async function TheBig3(ws, handleCommand, bot) {
    const [delay, coflPing, hypixelPing] = await Promise.all([
        checkCoflDelay(ws, handleCommand),
        checkCoflPing(ws, handleCommand),
        checkHypixelPing(bot)
    ]);
    return `\`\`Cofl Delay:\`\` ${delay} \n\`\`Cofl Ping:\`\` ${coflPing} \n\`\`Hypixel Ping:\`\` ${hypixelPing}`;
}

const colorCodes = [
    "213328",
    "213071",
    "148820",
    "19033",
    "20318",
    "21603",
    "23144",
    "24429",
    "25714",
    "27254",
    "30079",
    "31364",
    "32904",
    "34444",
    "35728",
    "37268",
    "37525"
];

function randomWardenDye() {
    return colorCodes[Math.floor(Math.random() * colorCodes.length)];
}

function normalNumber(num) {
    if (typeof num === 'number') return num;
    if (!num) return NaN;
    num = num.toLowerCase();
    if (num.includes('t')) {
        return parseInt(num.replace('t', '')) * 1_000_000_000_000;
    } else if (num.includes('b')) {
        return parseInt(num.replace('b', '')) * 1_000_000_000;
    } else if (num.includes('m')) {
        return parseInt(num.replace('m', '')) * 1_000_000;
    } else if (num.includes('k')) {
        return parseInt(num.replace('k', '')) * 1_000;
    }
    return parseInt(num);
}

async function sendPingStats(ws, handleCommand, bot, sold, bought) {
    const bigThree = await TheBig3(ws, handleCommand, bot);
    const embed = new MessageBuilder()
        .setFooter(`TPM - Bought ${bought} - Sold ${sold}`, `https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437`)
        .setTitle('Ping!')
        .addField('', bigThree)
        .setThumbnail(`https://mc-heads.net/head/${config.uuid}.png`)
        .setColor(randomWardenDye());
    sendDiscord(embed);
}

async function sendDiscord(embed, attempt = 0) {
    if (webhook) {
        try {
            if (Array.isArray(webhook)) {
                webhook.forEach(async (hook) => {
                    sender = new Webhook(hook);
                    sender.setUsername('TPM');
                    sender.setAvatar('https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless');
                    await sender.send(embed);
                })
            } else {
                await webhook.send(embed);
            }
        } catch {
            if (attempt < 3) {
                await sleep(5000)
                sendDiscord(embed, attempt + 1);
            }
        }
    }
}

async function putInAh(bot, slot = 63) {
    debug("starting put in ah")
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    await sleep(150)
    bot.chat("/ah")
    await betterOnce(bot, 'windowOpen')
    betterClick(slot, 0, 0, bot)
    await sleep(250)
    if (getWindowName(bot.currentWindow)?.includes('Auction House') || getWindowName(bot.currentWindow)?.includes('Co-op Auction House')) {
        logmc("§6[§bTPM§6] §cThere was already an item in the creation slot, attempting to remove it [Auto Cookie]")
        await removeFromAh(bot, "moving")
        if (tries < 2) {
            tries++
            await putInAh(bot, slot + 1)
            return;
        } else {
            logmc("§6[§bTPM§6] §cIssue with removing item from ah slot likely because your inv is full so giving up rip bozo (if your inv isnt full report pls :D)")
            return;
        }
    }
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    await sleep(150)
    tries = 0;
    return;
}

async function removeFromAh(bot, botstate) {

    const messages = {
        moving: {
            removedItem: "§6[§bTPM§6] §3Removed item from slot [Auto Cookie]",
            failedCreateSlot: "§6[§bTPM§6] §cFailed to find create slot :( leaving auto cookie there's an item in the slot [Auto Cookie]",
            failedBinAuction: (windowName) => `§6[§bTPM§6] §cFailed to open BIN Auction, got ${windowName}. Leaving auto cookie and there's an item in the slot ): [Auto Cookie]`,
            failedManageAuctions: (windowName) => `§6[§bTPM§6] §cFailed to open Manage auctions, got ${windowName}. Leaving relist and there's an item in the slot ): [Auto Cookie]`,
            foundCreateSlot: (slot) => `Found create slot ${slot} [Auto Cookie]`,
        },
        listing: {
            removedItem: "§6[§bTPM§6] §3Removed item from slot [Relist]",
            failedCreateSlot: "§6[§bTPM§6] §cFailed to find create slot :( leaving relist and there's an item in the slot [Relist]",
            failedBinAuction: (windowName) => `§6[§bTPM§6] §cFailed to open BIN Auction, got ${windowName}. Leaving relist and there's an item in the slot ): [Relist]`,
            failedManageAuctions: (windowName) => `§6[§bTPM§6] §cFailed to open Manage auctions, got ${windowName}. Leaving relist and there's an item in the slot ): [Relist]`,
            foundCreateSlot: (slot) => `Found create slot ${slot} [Relist]`,
        }
    };
    debug("starting remove from ah")
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    await sleep(150)
    bot.chat("/ah")
    await betterOnce(bot, 'windowOpen')
    betterClick(15, 0, 0, bot)
    await betterOnce(bot, 'windowOpen')
    if (getWindowName(bot.currentWindow)?.includes('Create BIN Auction') || getWindowName(bot.currentWindow)?.includes('Create Auction')) {
        if (getWindowName(bot.currentWindow)?.includes('Create Auction')) {
            await sleep(250);
            betterClick(48, 0, 0, bot)
            await sleep(250);
        }
        betterClick(13, 0, 0, bot)
        await sleep(250)
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
        logmc(messages[botstate].removedItem)
        return;
    } else if (getWindowName(bot.currentWindow)?.includes('Manage Auctions')) {
        let createSlot = bot.currentWindow.slots.find(obj => obj?.nbt?.value?.display?.value?.Name?.value?.includes('Create Auction'));
        createSlot = createSlot.slot;
        debug(messages[botstate].foundCreateSlot(createSlot));
        if (!createSlot) {
            logmc(messages[botstate].failedCreateSlot)
            if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
            return;
        } else {
            betterClick(createSlot, 0, 0, bot)
            await betterOnce(bot, 'windowOpen');
            await sleep(250);
            if (getWindowName(bot.currentWindow)?.includes('Create BIN Auction')) {
                betterClick(13, 0, 0, bot)
                await sleep(250)
                if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
                logmc(messages[botstate].removedItem)
                return;
            } else {
                logmc(messages[botstate].failedBinAuction(getWindowName(bot.currentWindow)));
                if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
                return;
            }
        }
    } else {
        logmc(messages[botstate].failedManageAuctions(getWindowName(bot.currentWindow)));
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
        return;
    }
}


async function omgCookie(bot, cookieTime) {

    if (cookieTime == 0) {
        return 0;
    }

    let emptyInvSlot = false;
    let itemCount = 0;
    bot.chat("/ah")
    await betterOnce(bot, 'windowOpen')
    bot?.inventory?.slots?.forEach((item, index) => {
        //console.log(bot.inventory?.slots[index]?.name,index)
        if (index >= 36 && index <= 43) {
            debug(item?.name, index)
            if (item != null) {
                itemCount++;
                debug("item count", itemCount)
            }
        }
    });
    if (itemCount < 8) {
        debug("Found an empty slot in the hotbar");
        emptyInvSlot = true;
    } else {
        debug("No empty slots in the hotbar");
        emptyInvSlot = false;
    }
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    await betterOnce(bot, 'windowClose')
    await sleep(150)

    if (emptyInvSlot == false) { await putInAh(bot) }

    bot.chat("/bz booster cookie")
    debug("bazzar cookie")
    await betterOnce(bot, 'windowOpen')
    await sleep(100)
    betterClick(11, 0, 0, bot) //click cookie
    debug("clicked cookie")
    await betterOnce(bot, 'windowOpen')
    betterClick(10, 0, 0, bot) //click instant buy
    debug("clicked instant buy")
    await betterOnce(bot, 'windowOpen')
    betterClick(10, 0, 0, bot) //confirm instant buy
    debug("confirmed instant buy")
    await sleep(250)

    if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    await sleep(150)
    let cookieIndex = bot.inventory.findInventoryItem('cookie').slot
    cookieIndex = (cookieIndex >= 36 && cookieIndex <= 43) ? (cookieIndex - 36) % 8 : cookieIndex
    debug("cookie index", cookieIndex)
    if (!cookieIndex || cookieIndex > 9) {
        logmc(`§6[§bTPM§6] §cFailed to use the cookie in slot ${cookieIndex}`);
        return;
    }
    bot.setQuickBarSlot(cookieIndex);
    await sleep(50);
    bot.activateItem();

    await betterOnce(bot, 'windowOpen')
    betterClick(11, 0, 0, bot)
    debug("activated cookie")
    await betterOnce(bot, 'windowClose')

    await sleep(250)
    if (emptyInvSlot == 0) await removeFromAh(bot, "moving")
    await sleep(500)

    return cookieTime + 100;

}

function betterClick(slot, mode1 = 0, mode2 = 0, bot) {
    if (!bot.currentWindow) {
        debug(`No window found for clicking ${slot}`);
        return;
    }
    let packets = getPackets();
    if (!packets) {
        error(`Packets weren't made for utils betterclick`);
    }
    packets.bump();
    bot.currentWindow.requiresConfirmation = false;
    bot.clickWindow(slot, mode1, mode2);
}

async function getCookiePrice() {
    try { return Math.round((await axios.get('https://api.hypixel.net/v2/skyblock/bazaar')).data.products.BOOSTER_COOKIE.quick_status.buyPrice + 5_000_000) } catch (e) { error(e) };
}


const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms))
module.exports = { noColorCodes, sendDiscord, randomWardenDye, sendPingStats, onlyNumbers, normalizeDate, normalNumber, IHATETAXES, formatNumber, sleep, checkHypixelPing, TheBig3, checkCoflDelay, getWindowName, saveData, getPurse, relistCheck, addCommasToNumber, nicerFinders, betterOnce, checkCoflPing, omgCookie, removeFromAh, getCookiePrice }