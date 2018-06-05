import * as Discord from 'discord.js';

import {Client} from 'discord.js';

const conf = require('./../../config/config.json');
const root_config = "./../../config/";

interface IMode {
    name: string;
    args: string[];
    description: string;
    activated: boolean;
}

export default function onReady(bot: Client, modes: {[key: string]: IMode}) {
    if(modes.reset.activated) {
        bot.user.setUsername(conf["username"])
            .catch(console.error);
        bot.user.setAvatar(root_config + conf["avatar"])
            .catch(console.error);
    }

    bot.user.setPresence({ game: { name: conf["game"] }, status: 'online' })
        .catch(console.error);

    console.log(conf["username"] + " is ready."); 

    console.log('Invite Link:');
    // the permissions required by the bot to function
    bot.generateInvite(36703232).then(console.log);
}