import { GameMessage } from '../interfaces';
import { createUserLink } from './create-user-link';

export function createGameMessageText({ go, skip, text }: GameMessage): string {
    const messageText: string[] = [`*${text}*\n`];
    if (go.length > 0) {
        const goCount: number = go.length;
        messageText.push(`Йдуть *(${goCount})* :`);
        messageText.push(go.map(createUserLink).join('\n'));
    }

    if (skip.length > 0) {
        const skipCount: number = skip.length;
        messageText.push(`Пропускають *(${skipCount})* :`);
        messageText.push(skip.map(createUserLink).join('\n'));
    }

    return messageText.join('\n');
}