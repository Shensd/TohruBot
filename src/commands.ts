import * as fs from 'fs'

const Discord = require('discord.js');

const root_img = "../res/img/";

const file_pics = '../res/json/pics.json';
const pics = require(file_pics);

import * as ytdl from 'ytdl-core'

// const ytdl = require("ytdl-core");
import * as youtubedl from 'youtube-dl'
import { Message, Client, OAuth2Application } from 'discord.js';
//const youtubedl = require("youtube-dl");

import {commandClear as clear,
        commandPlay as play,
        commandSkip as skip,
        commandStop as stop,
        commandLink as link,
        commandQueue as queue,
        commandVoteSkip as voteskip,
        commandSearch as search } from './music'
import { Utils } from './utils';

function img_reply(msg: Message, img: string) {
    msg.reply("", {files:[root_img + pics[img]]});
}

export interface ICommandParams {
    msg: Message;
    bot: Client;
    args: string[];
}

// defining the structure of our commands
export interface ICommand {
    name: string;
    description: string;
    category: string;
    usage: string;
    admin: boolean;
    process(params: ICommandParams): any;
}

export const commands: {[key: string]: ICommand} = {
    "help" : {
        name: "help",
        description: "displays this output or can be used for more info on a specific command",
        category: "utility",
        usage: "$help [commandname]",
        admin: false,
        process: function(params: ICommandParams) {
            let args = params.args;
            if(args.length) {
                let obj = commands[args.join(" ").toLowerCase()];
                if(!obj) {
                    params.msg.reply("Command not found.");
                }
                
                let helpText = 
                    "```\n" +
                    `Name       : ${ obj.name }\n` +
                    `Description: ${ obj.description }\n` +
                    `Usage      : ${ obj.usage }\n` +
                    "```";

                params.msg.reply(helpText);
                return;
            }

            let helpText = "```";
            const commandArray: ICommand[] = Utils.arrayFromValues<ICommand>(commands); 
            const longestName = Math.max(...commandArray.map((command: ICommand) => command.name.length))
            
            for(const k in commands) {
                let bufferStr = "";
                let command = commands[k];
                let bufferLen = (longestName + 1) - command.name.length;
                for(let i = 0; i < bufferLen; i++) {
                    bufferStr += "-";
                }
                helpText += `${ command.name } ${ bufferStr } ${ command.description }\n`;
            }
            helpText = 
                `${ helpText.substring(0, helpText.length - 2) }` +
                "```\n" +
                "Admin commands require the `Bot Commander` role\n" +
                "Use `$help commandname` for more information";
            
            params.msg.author.send(helpText);
            params.msg.reply("I have sent you a list of my commands!");
        }
    },
    "ping" : {
        name: "ping",
        description: "Pong!",
        category: "fun",
        usage: "$ping",
        admin: false,
        process: function(params: ICommandParams) {
            params.msg.reply('Pong!');
        }
    },
    "echo": {
        name: "echo",
        description: "I'll repeat back what you said",
        category: "fun",
        usage: "$echo what you want to hear here",
        admin: false,
        process: function(params: ICommandParams) {
            let content = params.args.join(' ');
            params.msg.reply(content);
        }
    },
    "thonk": {
        name: "thonk",
        description: "hmmmm",
        category: "fun",
        usage: "$thonk",
        admin: false,
        process: function(params: ICommandParams) {
            params.msg.reply(
                "", 
                {
                    files: [
                        root_img + "thonk/" + pics["thonk"][Math.floor(Math.random() * pics["thonk"].length)]
                    ]
                }
            );
            params.msg.delete();

        }
    },
    "play": {
        name: "play",
        description: "play audio from a given youtube video (search or url)",
        category: "music",
        usage: "play [url or keyword search here]",
        admin: false,
        process: function(params: ICommandParams) {

            play(params.msg, params.bot);

        }
    },
    /* 
    TODO 

    - once voteskip is implemented, this command should be reserved
      for those with the bot assigned admin role

    */
    "skip": {
        name: "skip",
        description: "skip currently playing audio",
        category: "music",
        usage: "$skip",
        admin: true,
        process: function(params: ICommandParams) {

            skip(params.msg, params.bot);

        }
    },
    "queue": {
        name: "queue",
        description: "get the current queue of songs",
        category: "music",
        usage: "$queue",
        admin: false,
        process: function(params: ICommandParams) {
            queue(params.msg, params.bot);

        }
    },
    /*
    "voteskip": {
        name: "voteskip",
        description: "voice channel vote to skip the current song",
        category: "music",
        usage: "$voteskip",
        admin: false,
        process: function(msg, bot) {   
            
           music.voteskip(msg, bot);

        }
    },
    */
    "stop": {
        name: "stop",
        description: "clears the queue and disconnects bot from voice channel",
        category: "music",
        usage: "$stop",
        admin: true,
        process: function(params: ICommandParams) {

            stop(params.msg, params.bot);

        }
    },
    "clear": {
        name: "clear",
        description: "clears the song queue",
        category: "music",
        usage: "$clear",
        admin: true,
        process: function(params: ICommandParams) {

            clear(params.msg, params.bot);
            
        }
    },
    "link": {
        name: "link",
        description: "provides a link to the currently playing song",
        category: "music",
        usage: "$link",
        admin: false,
        process: function(params: ICommandParams) {
            link(params.msg, params.bot);
            
        }
    },
    "search": {
        name: "search",
        description: "Searches for a song",
        category: "music",
        usage: "$search",
        admin: false,
        process: function(params: ICommandParams) {
            search(params.msg, params.bot, params.args.join(' '))
        }
    },
    
    "changename": {
        name: "changename",
        description: "Changes the bots name",
        category: "bot",
        usage: "$changename [name]",
        admin: true,
        process: async function(params: ICommandParams) {
            const isOwner = await Utils.isBotOwner(params.bot, params.msg.member);
            if (!isOwner){
                return void params.msg.reply('You must be the bot owner to run this command.');
            }
            if (!params.args.length){
                return void params.msg.reply('Could not find a name in your command')
            }
            const name = params.args.join(' ');
            params.bot.user.setUsername(name);
            params.msg.reply(`Changed my name to ${name}`);
        }
    },
    "changeavatar": {
        name: "changeavatar",
        description: "Changes the bots avatar",
        category: "bot",
        usage: "$changeavatar [avatar]",
        admin: true,
        process: async function(params: ICommandParams) {
            const isOwner = await Utils.isBotOwner(params.bot, params.msg.member);
            if (!isOwner){
                return void params.msg.reply('You must be the bot owner to run this command.');
            }
            if (!params.args.length){
                return void params.msg.reply('Could not find a link to a picture in your command.')
            }
            const avatar = params.args.shift()!;
            params.bot.user.setAvatar(avatar);
            params.msg.reply(`Got myself a new avatar`);
        }
    }
}
