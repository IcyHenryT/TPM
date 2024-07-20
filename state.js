let states = [];
function add(command, priority, state) {
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