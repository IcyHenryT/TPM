const fs = require('fs');
const path = require('path');
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

    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    } else {
        return negative ? '-' : '' + num.toString();
    }
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
            logger.error(`Error writing data to ${filePath}: ${err}`);
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
const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms))
module.exports = { noColorCodes, onlyNumbers, normalizeDate, IHATETAXES, formatNumber, sleep, getWindowName, saveData }