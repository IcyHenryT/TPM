function logmc(string) {//thanks baf and gpt
    let msg = '';
    if(!string) return;
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

    console.log('\x1b[0m\x1b[1m\x1b[90m' + msg + '\x1b[0m');
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
module.exports = {logmc};