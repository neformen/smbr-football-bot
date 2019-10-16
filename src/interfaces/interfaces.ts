import { User } from "node-telegram-bot-api";

export interface ILogGame {
    go: User[];
    skip: User[];
    text: string;
}

export interface ILog {
    [key: string]: ILogGame;
}