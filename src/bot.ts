import * as Discord from 'discord.js'
import * as mysql from 'mysql';

const auth        = require('../res/auth/auth.json');
const conf        = require('../config/config.json');
const pics        = require('../res/json/pics.json');

const root_img    = '../res/img/';
const root_config = "../config/"

import { commands, ICommandParams } from './commands'
import { Client, Message }  from 'discord.js'
import { Utils } from './utils';

import { getModes, IMode } from './util/modes';

import onReady from './events/onReady';
import onMessage from './events/onMessage';
import onGuildCreate from './events/onGuildCreate';
import onDisconnect from './events/onDisconnect';
import onDebug from './events/onDebug';

const bot: Client = new Discord.Client();

let modes: {[key: string]: IMode} = getModes();

function main() {
    if(modes.help.activated) {
        let str = "";
        for(const k in modes) {
            const obj = modes[k];
            str += obj.args + "     " + obj.name + "\n";
            str += "     " + obj.description + "\n";
        }
        console.log(str);
        process.exit(0);
    }
}


bot.on('ready', () => {
    onReady(bot, modes);
});

bot.on('message', (msg: Message) => {
    onMessage(bot, msg, modes);
});

bot.on('disconnect', () => {
   onDisconnect();
});

bot.on('debug', (info) => {
    onDebug(info, modes);
});

bot.on('guildCreate', (guild: Discord.Guild) => {
    onGuildCreate(guild);
});

bot.login(auth["token"]);

process.on('unhandledRejection', console.log);
process.on('uncaughtException', console.log);

if(require.main == module) {
    main();
}