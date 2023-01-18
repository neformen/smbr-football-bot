import { User } from 'node-telegram-bot-api';

export interface GameMessage {
    readonly go: User[];
    readonly skip: User[];
    readonly text: string;
}
