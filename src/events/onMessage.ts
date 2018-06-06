import * as Discord from 'discord.js';

import {Client, Message} from 'discord.js';

import { ICommandParams } from '../misc/globals';
import { commands } from './../commands';
import { Utils } from './../utils';

interface IMode {
    name: string;
    args: string[];
    description: string;
    activated: boolean;
}

export default function onMessage(bot: Client, msg: Message, modes: {[key: string]: IMode}) {
    if(msg.author == bot.user || msg.content[0] != "$"){
        return;
    }
    
    let [cmd, args] = Utils.getArgs(msg);
    
    if(modes.lock.activated) {
        console.log("Command was recieved but lock mode is enabled");
        return;
    }

    if(!commands[cmd]) {
        // command does not exist
        return;
    }

    if((commands[cmd].admin && msg.member.hasPermission('ADMINISTRATOR'))
        || !commands[cmd].admin
        || !msg.guild
        || msg.member.roles.exists("name", "Bot Commander")) {

        const params: ICommandParams  = {
            bot: bot,
            msg: msg,
            user: msg.author,
            args: args,
            content: args.join(" ")
        }
        
        return void commands[cmd].process(params);
    }

    msg.channel.send(":x: Invalid permissions");
}