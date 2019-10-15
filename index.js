const TelegramBot = require('node-telegram-bot-api');

const log = {};

const inlineKeybordReply = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: 'Плюс, я з рєбятами', callback_data: 'go' },
                { text: 'Мінус, буду спати', callback_data: 'notGo' }
            ]
        ]
    }
};

// replace the value below with the Telegram token you receive from @BotFather
const token = '872284536:AAG6MWWdTrcr4KMSi2_UskYxwB8SCdeKjcw';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
});

bot.onText(/\/game/, (msg) => {
    console.log(JSON.stringify(msg));
    log[msg.message_id + 1] = {
        go: [],
        notGo: []
    };

    bot.sendMessage(msg.chat.id, msg.text, inlineKeybordReply);
});

bot.on('callback_query', (callbackQuery) => {

    const payload = callbackQuery.data;
    const msg = callbackQuery.message;
    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        ...inlineKeybordReply
    };
    log[msg.message_id][payload].push(callbackQuery.from);
    const text = generateMessage(log[msg.message_id]);



    bot.editMessageText(text, opts);
});

function generateMessage({ go, notGo }) {
    let resultMessage = '';
    if (go.legth !== 0) {
        resultMessage += 'Йдуть \n';
        go.forEach(({ first_name, last_name }) => {
            resultMessage += `${first_name} ${last_name} \n`
        });
    }

    if (notGo.legth !== 0) {
        resultMessage += 'Пропускають \n';
        notGo.forEach(({ first_name, last_name }) => {
            resultMessage += `${first_name} ${last_name} \n`
        });
    }

    return resultMessage;
}
