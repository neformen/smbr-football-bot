import * as TelegramBot from "node-telegram-bot-api";
import { ILogGame, ILog } from "./interfaces/interfaces";

const log: ILog = {};
const port: number = Number(process.env.PORT) || 3000;

const inlineReplyOpts = {
    inline_keyboard: [
        [
            { text: 'Плюс, я з рєбятами', callback_data: 'go' },
            { text: 'Мінус, буду спати', callback_data: 'skip' }
        ]
    ]
}

const messageOpts: TelegramBot.SendMessageOptions = {
    parse_mode: 'Markdown',
    reply_markup: inlineReplyOpts
};

const prodOptions: TelegramBot.ConstructorOptions = {
    webHook: {
        // Port to which you should bind is assigned to $PORT variable
        // See: https://devcenter.heroku.com/articles/dynos#local-environment-variables
        port
        // you do NOT need to set up certificates since Heroku provides
        // the SSL certs already (https://<app-name>.herokuapp.com)
        // Also no need to pass IP because on Heroku you need to bind to 0.0.0.0
    }
};

const devOptions: TelegramBot.ConstructorOptions = {
    polling: true
};

const token = '872284536:AAG6MWWdTrcr4KMSi2_UskYxwB8SCdeKjcw';
const url = process.env.APP_URL || 'https://smbr-bot.herokuapp.com:443';
const bot = new TelegramBot(token, process.env.PROD ? prodOptions : devOptions);

if (process.env.PROD) {
    bot.setWebHook(`${url}/bot${token}`);
}


bot.onText(/\/game (.+)/, (msg, match) => {
    const messageBody = match[1];
    bot.sendMessage(msg.chat.id, `*${messageBody}*`, messageOpts);
});

bot.on('callback_query', (callbackQuery) => {
    const decision: string = callbackQuery.data;
    const msg: TelegramBot.Message = callbackQuery.message;
    const chatId: number = msg.chat.id;
    const msgId: number = msg.message_id
    const currPlayer: TelegramBot.User = callbackQuery.from;
    const opts: TelegramBot.EditMessageTextOptions = {
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
    let { go, skip } = log[msgId];
    const isGo = go.find((player) => player.id === currPlayer.id);
    const isSkip = skip.find((player) => player.id === currPlayer.id);

    if ((isGo && decision === 'go') || (isSkip && decision === 'skip')) {
        return;
    }

    go = go.filter(player => player.id !== currPlayer.id);
    skip = skip.filter(player => player.id !== currPlayer.id);
    Object.assign(log[msgId], { go, skip });
    log[msgId][decision].push(currPlayer);
    const text = generateMessage(log[msgId]);

    bot.editMessageText(text, opts);
});

function generateMessage({ go, skip, text }: ILogGame): string {
    let resultMessage = `*${text}*\n\n`;
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
