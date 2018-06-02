const Discord     = require('discord.js');
const commands    = require('./commands.js');

const auth        = require('../res/auth/auth.json');
const conf        = require('../config/config.json');
const pics        = require('../res/json/pics.json');

const root_img    = '../res/img/';
const root_config = "../config/"

import {Client}  from 'discord.js'

const bot: Client = new Discord.Client();

interface IMode {
    name: string;
    args: string[];
    description: string;
    activated: boolean;
}

let modes: {[key: string]: IMode} = {
    debug: {
        name: "Debug Mode",
        args: ["-d", "--debug"],
        description: "Activates debug mode in the api, logs all debug into to the console",
        activated: false
    },
    lock: {
        name: "Locked Mode",
        args: ["-l", "--lock", "--locked"],
        description: "Activates lock mode, bot is online but will not respond to commands",
        activated: false
    },
    help: {
        name: "Help",
        args: ["-h", "--help"],
        description: "Displays the help dialog",
        activated: false
    },
    reset: {
        name: "reset",
        args: ["-r", "--reset"],
        description: "Resets the bot's name and avatar to what was specified in the config",
        activated: false
    }
}

let args = process.argv.slice(1, process.argv.length);
for(let i = 0; i < args.length; i++) {
    for(let k in modes) {
        const obj = modes[k];
        if(typeof obj.args == "string") {
            if(args[i] == obj.args) {
                obj.activated = true;
                console.log(obj.name + " enabled.");
                break;
            }
        } else {
            for(let j = 0; j < obj.args.length; j++) {
                if(args[i] == obj.args[j]) {
                    obj.activated = true;
                    console.log(obj.name + " enabled.");
                    break;
                }
            }
        }
    }   
}

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


bot.on('ready', () => {
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

});

bot.on('message', (msg) => {
    if(msg.author == bot.user) return;
    if(msg.content[0] != "$") return;
    
    let cmd = msg.content.split(" ")[0].slice(1, msg.content.split(" ")[0].length).toLowerCase();
    let args = msg.content.split(" ").slice(1, msg.content.split(" ").length);
    
    if(modes.lock.activated) {
        console.log("Command was recieved but lock mode is enabled");
        return;
    }

    if(commands.commands[cmd]) {
        if(!commands.commands[cmd].admin) {
            commands.commands[cmd].process(msg, bot);
        } else { // command requires admin
            if(!msg.guild) { //dm
                commands.commands[cmd].process(msg, bot);
                return;
            }

            if(msg.member.roles.exists("name", "Bot Commander")) {
                commands.commands[cmd].process(msg, bot);
            } else {
                msg.channel.send(":x: Invalid permissions");
            }
        }
    }
});

bot.on('disconnect', () => {
   console.log('Bot disconnected.'); 
});

bot.on('debug', (info) => {
    if(modes.debug.activated) {
        console.log(info);
    }
});

bot.login(auth["token"]);
