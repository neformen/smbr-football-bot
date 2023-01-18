import { User } from 'node-telegram-bot-api';

export interface GameRecord {
    readonly go: User[];
    readonly skip: User[];
    readonly text: string;
    readonly chatId: number;
    readonly msgId: number;
    readonly id: string;
}