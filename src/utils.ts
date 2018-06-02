import { Message } from "discord.js";

export namespace Utils {
    export function getArgs(message: Message): [string, string[]]{
        const args = message.content.split(' ');
        const command = args[0].substring(1);
        return [command, args.splice(1)]
    }
}