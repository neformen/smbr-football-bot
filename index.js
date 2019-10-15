const TelegramBot = require('node-telegram-bot-api');

const log = {};

const inlineKeybordReply = {
    parse_mode: 'Markdown',
    reply_markup: {
        inline_keyboard: [
            [
                { text: 'Плюс, я з рєбятами', callback_data: 'go' },
                { text: 'Мінус, буду спати', callback_data: 'skip' }
            ]
        ]
    }
};

// replace the value below with the Telegram token you receive from @BotFather
const token = '872284536:AAG6MWWdTrcr4KMSi2_UskYxwB8SCdeKjcw';
const options = {
    webHook: {
      // Port to which you should bind is assigned to $PORT variable
      // See: https://devcenter.heroku.com/articles/dynos#local-environment-variables
      port: process.env.PORT
      // you do NOT need to set up certificates since Heroku provides
      // the SSL certs already (https://<app-name>.herokuapp.com)
      // Also no need to pass IP because on Heroku you need to bind to 0.0.0.0
    }
  };
  const url = process.env.APP_URL || 'https://smbr-bot.herokuapp.com:443';
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, options);

bot.setWebHook(`${url}/bot${TOKEN}`);


bot.onText(/\/game (.+)/, (msg, match) => {
    const messageBody = match[1];
    bot.sendMessage(msg.chat.id, `*${messageBody}*`, inlineKeybordReply);
});

bot.on('callback_query', (callbackQuery) => {
    const decision = callbackQuery.data;
    const msg = callbackQuery.message;
    const msgId = '' + msg.message_id + msg.chat.id;
    const currPlayer = callbackQuery.from;
    const opts = {
        chat_id: msg.chat.id,
        message_id: msgId,
        ...inlineKeybordReply
    };
    if ( log[msgId] === undefined ) {
        log[msgId] = {
            go: [],
            skip: [],
            title: msg.text
        };
    }
    let { go, skip } = log[msgId];
    go = go.filter(player => player.id !== currPlayer.id);
    skip = skip.filter(player => player.id !== currPlayer.id);
    Object.assign(log[msgId], { go, skip });
    log[msgId][decision].push(currPlayer);
    const text = generateMessage(log[msgId]);

    bot.editMessageText(text, opts);
});

function generateMessage({ go, skip, title }) {
    let resultMessage = `${title}\n\n`;
    if (go.length !== 0) {
        resultMessage += 'Йдуть \n';
        go.forEach(({ first_name, last_name, id }) => {
            resultMessage += `[${first_name} ${last_name}](tg://user?id=${id})\n`;
        });
    }

    if (skip.length !== 0) {
        resultMessage += 'Пропускають \n';
        skip.forEach(({ first_name, last_name, id }) => {
            resultMessage += `[${first_name} ${last_name}](tg://user?id=${id})\n`;
        });
    }

    return resultMessage;
}
