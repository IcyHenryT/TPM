const {logmc} = require('./logger.js');

let states = [];

function add(command, priority, state) {
    if(states.length > 6){
        states = [];
        logmc(`§6[§bTPM§6] §cQueue got too big! Clearing it. Please report to icy`);
    }
    states.push({
        command: command,
        priority: priority,
        state: state
    })
    console.log(states);
    states = states.sort((a, b) => b.priority - a.priority);
}
function top() {
    if(states.length === 0) return null;
    return states[0].priority;
}
function get() {
    if(states.length == 0){
        //console.log(`States is null!`, states)
        return null;
    }
    const command = states[0];
    //states.shift();
    return command;
}
function next(){
    states.shift();
}
module.exports = { add, top, get, next };