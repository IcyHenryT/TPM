const fs = require('fs');
const path = require('path');
const { debug } = require('./logger.js');
function noColorCodes(text) {
    return text.replace(/§./g, '')
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
            let scoreboard = bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, ''));
            scoreboard.forEach(e => {
                if (e.includes('Purse:')) {
                    let purseString = e.substring(e.indexOf(':') + 1).trim();
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
        const listen = (message, type) => {
            let text = noColorCodes(message.getText(null));
            if (type === 'chat') {
                const pingwarsRegex = /Your Ping - ([\d,]+)ms/;
                const cooldownRegex = /You must wait to use social commands again!/;
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

const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms))
module.exports = { noColorCodes, randomWardenDye, onlyNumbers, normalizeDate, normalNumber, IHATETAXES, formatNumber, sleep, checkHypixelPing, TheBig3, checkCoflDelay, getWindowName, saveData, getPurse, relistCheck, addCommasToNumber, nicerFinders, betterOnce, checkCoflPing }