import TelegramBot, { InlineKeyboardMarkup, SendMessageOptions, ConstructorOptions, Message, CallbackQuery, User, EditMessageTextOptions } from "node-telegram-bot-api";
import * as mongoose from 'mongoose';
import { HistoryItems } from './models/historyItem';
import { config } from 'dotenv';
import { createGameMessageText, isDefined } from './utils';
import { Decision, GameRecord, GameMessage } from './interfaces';

export type Chat = Map<number, GameMessage>

if (process.env.PROD !== 'TRUE') {
    config();
}

const port: number = Number(process.env.PORT);
const TOKEN: string = process.env.BOT_TOKEN;
const databaseUrl: string = process.env.DB_URL;
const url: string = process.env.APP_URL;

const inlineReplyOpts: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: 'Плюс, я з рєбятами', callback_data: Decision.Go },
            { text: 'Мінус, буду спати', callback_data: Decision.Skip }
        ]
    ]
};
const messageOpts: SendMessageOptions = {
    parse_mode: 'Markdown',
    reply_markup: inlineReplyOpts
};
const prodOptions: ConstructorOptions = {
    webHook: {
        port
    }
};
const devOptions: ConstructorOptions = {
    polling: true
}

let bot: TelegramBot;
const options: ConstructorOptions = process.env.PROD ? prodOptions : devOptions;
const chats: Map<number, Chat> = new Map();

mongoose.set('strictQuery', false);
mongoose.connect(databaseUrl, {
}).then(() => {
    HistoryItems.find({}).then((historyItems) => {
        historyItems.forEach((historyItem) => {
            const { go, chatId, text, skip, msgId } = <GameRecord>historyItem.toObject();
            const message: GameMessage = { go, skip, text };

            if (!isDefined(chats.get(chatId))) {
                chats.set(chatId, new Map());
            }

            chats.get(chatId).set(msgId, message);

        });

        bot = new TelegramBot(TOKEN, options);

        if (process.env.PROD) {
            bot.setWebHook(`${url}/bot${TOKEN}`);
        }

        bot.onText(/\/game (.+)/, async (msg: Message, match: RegExpExecArray) => {
            const messageText: string = match[1];
            await bot.sendMessage(msg.chat.id, `*${messageText}*`, messageOpts);
        });

        bot.on('callback_query', onCallbackQuery);
    })
});

async function onCallbackQuery(callbackQuery: CallbackQuery): Promise<void> {
    const decision: Decision = callbackQuery.data as Decision;
    let isNewChat: boolean = false;
    const msg: Message = callbackQuery.message;
    const chatId: number = msg.chat.id;
    const msgId: number = msg.message_id
    const currPlayer: User = callbackQuery.from;
    const opts: EditMessageTextOptions = {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: inlineReplyOpts,
        parse_mode: 'Markdown'
    };

    if (!isDefined(chats.get(chatId))) {
        chats.set(chatId, new Map());
        isNewChat = true;
    }

    if (!isDefined(chats.get(chatId).get(msgId))) {
        const chat: Chat = chats.get(chatId);
        let message: GameMessage = {
            go: [],
            skip: [],
            text: msg.text
        };
        chat.set(msgId, message);
        isNewChat = true;
    }
    let message: GameMessage = chats.get(chatId).get(msgId);
    let { go, skip, text: title } = message;
    const isGo: User = go.find((player) => player.id === currPlayer.id);
    const isSkip: User = skip.find((player) => player.id === currPlayer.id);

    if ((isGo && decision === Decision.Go) || (isSkip && decision === Decision.Skip)) {
        return;
    }

    go = go.filter(player => player.id !== currPlayer.id);
    skip = skip.filter(player => player.id !== currPlayer.id);
    message = {
        ...message,
        go,
        skip
    };
    message[decision].push(currPlayer);
    const text: string = createGameMessageText(message);
    const id: string = `${msgId}${chatId}`;
    await bot.editMessageText(text, opts);
    let { go: nGo, skip: nSkip } = message;
    if (isNewChat) {
        const newChat: mongoose.Document = new HistoryItems({ go: nGo, skip: nSkip, text: title, chatId, msgId, id });
        try {
            await newChat.save();
            console.log('save');
        } catch (err: unknown) {
            console.log('error happens(create):', err);
        }
    } else {
        try {
            HistoryItems.findOneAndUpdate({ id }, { go: nGo, skip: nSkip });
            console.log('findOneAndUpdate');
        } catch (err: unknown) {
            console.log('error happens(update):', err);
        }
    }
}
