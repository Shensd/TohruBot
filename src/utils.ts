import { Message, GuildMember, OAuth2Application, Client } from "discord.js";

export namespace Utils {
    export function getArgs(message: Message): [string, string[]]{
        const args = message.content.split(' ');
        const command = args[0].substring(1);
        return [command, args.splice(1)]
    }

    export function isBotOwner(bot: Client, member: GuildMember): Promise<boolean>{
        return bot.fetchApplication().then((app: OAuth2Application) => {
            return (app.owner.id === member.id)
        }) 
    }
    export function arrayFromValues<T>(object: {[key: string]: T}): T[]{
        return Object.keys(object).map(key => object[key]);
    }
}