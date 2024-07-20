const EventEmitter = require('events');
const Window = new EventEmitter();
let old = null;
function check(bot){
    if(!bot.currentWindow) {
        old = null;
        return;
    }
    if(old !== bot.currentWindow) {
        old = bot.currentWindow;
        Window.emit('newWindow', bot.currentWindow)
    }
}
module.exports = {check, Window}