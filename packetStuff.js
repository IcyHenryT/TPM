let bot;
let actionID = 1;
function getPackets() {
    if (bot) {
        return bot;
    } else {
        console.error(`Thug shake!! Packets don't exist yet`);
        return;
    }
}
async function makePackets(client) {
    remake = {
        sendMessage: function (text) {
            client.write('chat', {
                message: text
            })
        },
        click: function (slot, id, itemID) {
            client.write('window_click', {
                windowId: id,
                slot: slot,
                mouseButton: 2,
                mode: 3,
                item: { "blockId": itemID },
                action: 1
            })
            actionID++
        },
        bump: function () {
            actionID++
        },
        confirmClick: function (windowID) {
            client.write('transaction', {
                windowId: windowID,
                action: actionID,
                accepted: true
            })
        }
    }
    bot = remake;
}
module.exports = { getPackets, makePackets };