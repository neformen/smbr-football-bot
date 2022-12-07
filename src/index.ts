import * as TelegramBot from "node-telegram-bot-api";
import * as mongoose from 'mongoose';
import { ILogGame, ILog, IlogDataBase } from "./interfaces/interfaces";
import HistoryItems from './models/historyItem';
import { config } from "dotenv";

if (!process.env.PROD) {
    config();
}

const port: number = Number(process.env.PORT);
const TOKEN: string = process.env.BOT_TOKEN;
const devDBUrl: string = process.env.DB_URL;
const url: string = process.env.APP_URL;

const inlineReplyOpts: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: 'Плюс, я з рєбятами', callback_data: 'go' },
            { text: 'Мінус, буду спати', callback_data: 'skip' }
        ]
    ]
};
const messageOpts: TelegramBot.SendMessageOptions = {
    parse_mode: 'Markdown',
    reply_markup: inlineReplyOpts
};
const prodOptions: TelegramBot.ConstructorOptions = {
    webHook: {
        port
    }
};
const devOptions: TelegramBot.ConstructorOptions = {
    polling: true
};

let bot: TelegramBot;
const options: TelegramBot.ConstructorOptions = process.env.PROD ? prodOptions : devOptions;
const log: ILog = new Map();

mongoose.connect(devDBUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(async () => {
    await HistoryItems.find({}, (_err, historyItems) => {
        historyItems.forEach((historyItem) => {
            const { go, chatId, text, skip, msgId } = <IlogDataBase>historyItem.toObject();
            const logRecord: ILogGame = { go, skip, text };
    
            if (isUndefined(log.get(chatId))) {
                log.set(chatId, new Map());
            }
    
            log.get(chatId).set(msgId, logRecord);
        });
    
        bot = new TelegramBot(TOKEN, options);
    
        if (process.env.PROD) {
            bot.setWebHook(`${url}/bot${TOKEN}`);
        }
    
        bot.onText(/\/game (.+)/, function (msg, match) {
            const messageBody = match[1];
            bot.sendMessage(msg.chat.id, `*${messageBody}*`, messageOpts);
        });
        
        bot.on('callback_query', onCallbackQuery);
    });
});

async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const decision: string = callbackQuery.data;
    let newItem: boolean = false;
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

    if (isUndefined(log.get(chatId))) {
        log.set(chatId, new Map());
        newItem = true;
    }

    if (isUndefined(log.get(chatId).get(msgId))) {
        let chatRecords = log.get(chatId);
        let logRecord: ILogGame = {
            go: [],
            skip: [],
            text: msg.text
        };
        chatRecords.set(msgId, logRecord);
        newItem = true;
    }
    const logRecord: ILogGame = log.get(chatId).get(msgId);
    let { go, skip, text: title } = logRecord;
    const isGo: TelegramBot.User = go.find((player) => player.id === currPlayer.id);
    const isSkip: TelegramBot.User = skip.find((player) => player.id === currPlayer.id);

    if ((isGo && decision === 'go') || (isSkip && decision === 'skip')) {
        return;
    }

    go = go.filter(player => player.id !== currPlayer.id);
    skip = skip.filter(player => player.id !== currPlayer.id);
    Object.assign(logRecord, { go, skip });
    logRecord[decision].push(currPlayer);
    const text: string = generateMessage(logRecord);
    const id: string =`${msgId}${chatId}`;
    let { go: nGo, skip: nSkip } = logRecord;
    if (newItem) {
        const newRecord = new HistoryItems({ go: nGo, skip: nSkip, text: title, chatId, msgId, id });
        await newRecord.save((err) => {
            console.log('save')
        });
    } else {
        await HistoryItems.findOneAndUpdate({ id }, { go: nGo, skip: nSkip });
    }

    bot.editMessageText(text, opts);
}

function generateUserLink({ first_name, last_name, id }: TelegramBot.User): string {
    const fullName: string = last_name ? `${first_name} ${last_name}` : first_name;
    return `[${fullName}](tg://user?id=${id})`;
}

function generateMessage({ go, skip, text }: ILogGame): string {
    const messageLog: string[] = [`*${text}*\n`];
    if (go.length !== 0) {
        const goCount: number = go.length;
        messageLog.push(`Йдуть *(${goCount})* :`);
        messageLog.push(go.map(generateUserLink).join('\n'));
    }

    if (skip.length !== 0) {
        const skipCount: number = skip.length;
        messageLog.push(`Пропускають *(${skipCount})* :`);
        messageLog.push(skip.map(generateUserLink).join('\n'));
    }

    return messageLog.join('\n');
}

function isUndefined(value: any): boolean {
    return value === undefined || value === null;
}
