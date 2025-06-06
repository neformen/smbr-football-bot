import { config } from "dotenv";
import * as TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';

import { GameByMessage, GameMessage, GameRecord } from './models';
import { GameRecords } from './schemas';

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
      { text: 'Мінус, буду спати', callback_data: 'skip' },
      { text: '50/50', callback_data: 'unconfirmed' }
    ]
  ]
};
const messageOpts: TelegramBot.SendMessageOptions = {
  parse_mode: 'Markdown',
  reply_markup: inlineReplyOpts
};
const prodOptions: TelegramBot.ConstructorOptions = {
  webHook: { port }
};
const devOptions: TelegramBot.ConstructorOptions = { polling: true };

let bot: TelegramBot;
const options: TelegramBot.ConstructorOptions = process.env.PROD ? prodOptions : devOptions;
const gamesByChat: Map<number, GameByMessage> = new Map();

mongoose.connect(devDBUrl).then(async () => {
  await GameRecords.find({}).then((gameRecords) => {
    gameRecords.forEach((gameRecord) => {
      const { go, chatId, text, skip, msgId, unconfirmed } = gameRecord.toObject() as GameRecord;
      const gameMessage: GameMessage = { go, skip, unconfirmed, text };
    
      if (isUndefined(gamesByChat.get(chatId))) {
        gamesByChat.set(chatId, new Map());
      }

      gamesByChat.get(chatId).set(msgId, gameMessage);
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
  const decision = callbackQuery.data;
  let newItem = false;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const msgId = msg.message_id
  const currPlayer = callbackQuery.from;
  const opts: TelegramBot.EditMessageTextOptions = {
    chat_id: chatId,
    message_id: msgId,
    reply_markup: inlineReplyOpts,
    parse_mode: 'Markdown'
  };

  if (isUndefined(gamesByChat.get(chatId))) {
    gamesByChat.set(chatId, new Map());
    newItem = true;
  }

  if (isUndefined(gamesByChat.get(chatId).get(msgId))) {
    let chatGames = gamesByChat.get(chatId);
    let gameMessage: GameMessage = {
      go: [],
      skip: [],
      unconfirmed: [],
      text: msg.text
    };

    chatGames.set(msgId, gameMessage);
    newItem = true;
  }
  
  const gameMessage = gamesByChat.get(chatId).get(msgId);
  let { go, skip, unconfirmed, text: title } = gameMessage;
  const isGo = go.find((player) => player.id === currPlayer.id);
  const isSkip = skip.find((player) => player.id === currPlayer.id);
  const isUnconfirmed = unconfirmed.find((player) => player.id === currPlayer.id);

  if ((isGo && decision === 'go') || (isSkip && decision === 'skip') || (isUnconfirmed && decision === 'unconfirmed')) {
    return;
  }

  go = go.filter(player => player.id !== currPlayer.id);
  skip = skip.filter(player => player.id !== currPlayer.id);
  unconfirmed = unconfirmed.filter(player => player.id !== currPlayer.id);
  Object.assign(gameMessage, { go, skip, unconfirmed });
  gameMessage[decision].push(currPlayer);
  const text = getMessage(gameMessage);
  const id = `${msgId}${chatId}`;
  let { go: nGo, skip: nSkip, unconfirmed: nUnconfirmed } = gameMessage;

  if (newItem) {
    const gameRecord = new GameRecords({ go: nGo, skip: nSkip, unconfirmed: nUnconfirmed, text: title, chatId, msgId, id });

    await gameRecord.save();
  } else {
    await GameRecords.findOneAndUpdate({ id }, { go: nGo, skip: nSkip, unconfirmed: nUnconfirmed });
  }

  bot.editMessageText(text, opts);
}

function getUserLink({ first_name, last_name, id }: TelegramBot.User): string {
  const fullName = last_name ? `${first_name} ${last_name}` : first_name;
  return `[${fullName}](tg://user?id=${id})`;
}

function getMessage({ go, skip, unconfirmed, text }: GameMessage): string {
  const messageLog = [`*${text}*\n`];
  if (go.length !== 0) {
    const goCount = go.length;
    messageLog.push(`Йдуть *(${goCount})* :`);
    messageLog.push(go.map(getUserLink).join('\n'));
  }

  if (skip.length !== 0) {
    const skipCount = skip.length;
    messageLog.push(`Пропускають *(${skipCount})* :`);
    messageLog.push(skip.map(getUserLink).join('\n'));
  }

  if (unconfirmed.length !== 0) {
    const unconfirmedCount = unconfirmed.length;
    messageLog.push(`Пізніше скажу *(${unconfirmedCount})* :`);
    messageLog.push(unconfirmed.map(getUserLink).join('\n'));
  }

   return messageLog.join('\n');
}

function isUndefined(value: unknown): boolean {
  return value === undefined || value === null;
}
