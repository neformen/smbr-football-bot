"use strict";
exports.__esModule = true;
var TelegramBot = require("node-telegram-bot-api");
var log = {};
var port = Number(process.env.PORT) || 3000;
var inlineReplyOpts = {
    inline_keyboard: [
        [
            { text: 'Плюс, я з рєбятами', callback_data: 'go' },
            { text: 'Мінус, буду спати', callback_data: 'skip' }
        ]
    ]
};
var messageOpts = {
    parse_mode: 'Markdown',
    reply_markup: inlineReplyOpts
};
var prodOptions = {
    webHook: {
        // Port to which you should bind is assigned to $PORT variable
        // See: https://devcenter.heroku.com/articles/dynos#local-environment-variables
        port: port
        // you do NOT need to set up certificates since Heroku provides
        // the SSL certs already (https://<app-name>.herokuapp.com)
        // Also no need to pass IP because on Heroku you need to bind to 0.0.0.0
    }
};
var devOptions = {
    polling: true
};
var token = '872284536:AAG6MWWdTrcr4KMSi2_UskYxwB8SCdeKjcw';
var url = process.env.APP_URL || 'https://smbr-bot.herokuapp.com:443';
var bot = new TelegramBot(token, process.env.PROD ? prodOptions : devOptions);
if (process.env.PROD) {
    bot.setWebHook(url + "/bot" + token);
}
bot.onText(/\/game (.+)/, function (msg, match) {
    var messageBody = match[1];
    bot.sendMessage(msg.chat.id, "*" + messageBody + "*", messageOpts);
});
bot.on('callback_query', function (callbackQuery) {
    var decision = callbackQuery.data;
    var msg = callbackQuery.message;
    var chatId = msg.chat.id;
    var msgId = msg.message_id;
    var currPlayer = callbackQuery.from;
    var opts = {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: inlineReplyOpts,
        parse_mode: 'Markdown'
    };
    if (log[msgId] === undefined) {
        log[msgId] = {
            go: [],
            skip: [],
            text: msg.text
        };
    }
    var _a = log[msgId], go = _a.go, skip = _a.skip;
    var isGo = go.find(function (player) { return player.id === currPlayer.id; });
    var isSkip = skip.find(function (player) { return player.id === currPlayer.id; });
    if ((isGo && decision === 'go') || (isSkip && decision === 'skip')) {
        return;
    }
    go = go.filter(function (player) { return player.id !== currPlayer.id; });
    skip = skip.filter(function (player) { return player.id !== currPlayer.id; });
    Object.assign(log[msgId], { go: go, skip: skip });
    log[msgId][decision].push(currPlayer);
    var text = generateMessage(log[msgId]);
    bot.editMessageText(text, opts);
});
function generateMessage(_a) {
    var go = _a.go, skip = _a.skip, text = _a.text;
    var resultMessage = "*" + text + "*\n\n";
    if (go.length !== 0) {
        resultMessage += 'Йдуть \n';
        go.forEach(function (_a) {
            var first_name = _a.first_name, last_name = _a.last_name, id = _a.id;
            resultMessage += "[" + first_name + " " + last_name + "](tg://user?id=" + id + ")\n";
        });
    }
    if (skip.length !== 0) {
        resultMessage += 'Пропускають \n';
        skip.forEach(function (_a) {
            var first_name = _a.first_name, last_name = _a.last_name, id = _a.id;
            resultMessage += "[" + first_name + " " + last_name + "](tg://user?id=" + id + ")\n";
        });
    }
    return resultMessage;
}
