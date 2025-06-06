import { User } from "node-telegram-bot-api";

export interface ILogGame {
    go: User[];
    skip: User[];
    unconfirmed: User[];
    text: string;
}

export type ILog = Map<number, IlogChat>;

export type IlogChat = Map<number, ILogGame>

export interface IlogDataBase {
    go: User[];
    skip: User[];
    unconfirmed: User[];
    text: string;
    chatId: number;
    msgId: number;
    id: string;
}
