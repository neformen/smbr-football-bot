import {User} from "node-telegram-bot-api";

export function createUserLink({ first_name, last_name, id }: User): string {
    const fullName: string = last_name ? `${first_name} ${last_name}` : first_name;
    return `[${fullName}](tg://user?id=${id})`;
}