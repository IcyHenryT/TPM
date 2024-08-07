const { createLogger, format, transports } = require('winston');
const { combine, printf, colorize } = format;
const fs = require('fs');

const directoryPath = './logs';

if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
}
function formatDate() {
    const date = new Date();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);

    // Format the date to be filename-friendly
    const formattedDate = `${month}-${day}-${year}_${hours}-${strMinutes}${ampm}`;
    return formattedDate;
}
const time = formatDate();
const errorLogPath = `${directoryPath}/error.log`;
const latestLogPath = `${directoryPath}/latest.log`;
const timelog = `${directoryPath}/${time}.log`;

function resetLogFile(logFilePath) {
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, ''); 
    } else {
        fs.truncateSync(logFilePath, 0); 
    }
}

resetLogFile(latestLogPath);

function logmc(string) {
    let msg = '';
    if (!string) return;
    let split = string.split('§');
    msg += split[0];

    for (let a of string.split('§').slice(1, split.length)) {
        let color = a.charAt(0);
        let message = a.substring(1, a.length);

        if (colors[color]) {
            msg += colors[color];
        }
        msg += message;
    }

    info('\x1b[0m\x1b[1m\x1b[90m' + msg + '\x1b[0m');
}

const colors = {
    '0': '\x1b[30m', // black
    '1': '\x1b[34m', // dark blue
    '2': '\x1b[32m', // dark green
    '3': '\x1b[36m', // dark cyan
    '4': '\x1b[31m', // dark red
    '5': '\x1b[35m', // dark magenta
    '6': '\x1b[33m', // dark yellow
    '7': '\x1b[37m', // light gray
    '8': '\x1b[90m', // dark gray
    '9': '\x1b[94m', // light blue
    'a': '\x1b[92m', // light green
    'b': '\x1b[96m', // light cyan
    'c': '\x1b[91m', // light red
    'd': '\x1b[95m', // light magenta
    'e': '\x1b[93m', // yellow
    'f': '\x1b[97m', // white
};

// Regex to match ANSI escape sequences
const ansiRegex = /\x1b\[[0-9;]*m/g;

const regex = /[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|;:'",. <>/?`~\\]/g;

const myFormat = printf(({ message }) => {
    return message;
});

const plainFormat = printf(({ message }) => {
    // Remove ANSI escape sequences
    message = message.replace(ansiRegex, '');
    // Keep only the characters that match the regex
    message = message.match(regex)?.join('') || '';
    return message;
});

const logger = createLogger({
    level: 'silly',
    transports: [
        new transports.Console({
            level: 'info',
            format: combine(
                colorize(),
                myFormat
            )
        }),
        new transports.File({
            filename: errorLogPath,
            level: 'error',
            format: plainFormat
        }),
        new transports.File({
            filename: latestLogPath,
            format: plainFormat
        }),
        new transports.File({
            filename: timelog,
            format: plainFormat
        })
    ]
});

function log(message, type) {
    switch (type) {
        case "silly":
            logger.silly(message);
            break;
        case "error":
            logger.error(message);
            break;
        case "info":
            logger.info(message);
            break;
        case "debug":
            logger.debug(message);
    }
}

function silly(...args) {
    log(args.join(':'), "silly");
}

function debug(...args) {
    log(args.join(':'), "debug");
}

function error(...args) {
    log(args.join(':'), "error");
}

function info(...args) {
    log(args.join(':'), "info");
}

module.exports = { silly, debug, error, info, logmc };
