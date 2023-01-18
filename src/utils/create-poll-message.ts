import { GameMessage } from '../interfaces';
import { createUserLink } from './create-user-link';

export function createPollMessage({ go, skip, text }: GameMessage): string {
    const messageLog: string[] = [`*${text}*\n`];
    if (go.length !== 0) {
        const goCount: number = go.length;
        messageLog.push(`Йдуть *(${goCount})* :`);
        messageLog.push(go.map(createUserLink).join('\n'));
    }

    if (skip.length !== 0) {
        const skipCount: number = skip.length;
        messageLog.push(`Пропускають *(${skipCount})* :`);
        messageLog.push(skip.map(createUserLink).join('\n'));
    }

    return messageLog.join('\n');
}