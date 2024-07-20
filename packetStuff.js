let bot;
function getPackets() {
    if (bot) {
        return bot;
    } else {
        console.error(`Thug shake!! Packets don't exist yet`);
    }
}
async function makePackets(client) {
    remake = {
        sendMessage: function (text) {
            client.write('chat', {
                message: text
            })
        },
        click: function (slot, id) {
            client.write('window_click',{
                windowId: id,
                slot: slot,
                mouseButton: 2,
                action: 3,
                mode: null,
                item: 0
        })
        }
    }
    bot = remake;
}
module.exports = { getPackets, makePackets };