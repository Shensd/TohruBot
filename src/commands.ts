import * as fs from 'fs'

const Discord = require('discord.js');

const root_img = "../res/img/";

const file_pics = '../res/json/pics.json';
const pics = require(file_pics);

import * as ytdl from 'ytdl-core'

// const ytdl = require("ytdl-core");
import * as youtubedl from 'youtube-dl'
import { Message, Client } from 'discord.js';
//const youtubedl = require("youtube-dl");

import {command_clear as clear,
        command_play as play,
        command_skip as skip,
        command_stop as stop,
        command_link as link,
        command_queue as queue,
        command_voteskip as voteskip } from './music'

function img_reply(msg: Message, img: string) {
    msg.reply("", {files:[root_img + pics[img]]});
}

// defining the structure of our commands
interface ICommand {
    name: string;
    description: string;
    category: string;
    usage: string;
    admin: boolean;
    process(msg: Message, bot: Client): void;
}

var commands: {[key: string]: ICommand} = {
    "help" : {
        name: "help",
        description: "displays this output or can be used for more info on a specific command",
        category: "utility",
        usage: "$help [commandname]",
        admin: false,
        process: function(msg: Message, bot: Client) {
            let args = msg.content.split(" ").slice(1, msg.content.split(" ").length);
            if(msg.content.split(" ").length > 1) {
                if(commands[args.join(" ").toLowerCase()]) {
                    let str = "```";
                    let obj = commands[args.join(" ").toLowerCase()];
                    str += "Name       : " + obj.name + "\n";
                    str += "Description: " + obj.description + "\n";
                    str += "Usage      : " + obj.usage + "\n";
                    str += "```";
                    msg.reply(str);
                } else {
                    msg.reply("Command not found.");
                }
                return;
            }
            let str = "```";
            let longest_name = 0;
            for(const k in commands) {
                let obj = commands[k];
                if(obj.name.length > longest_name) longest_name = obj.name.length;
            }
            for(const k in commands) {
                let filler_str = "";
                let obj = commands[k];
                let filler_len = (longest_name + 1) - obj.name.length;
                for(let i = 0; i < filler_len; i++) {
                    filler_str += "-";
                }
                str += obj.name + " " + filler_str + " " + obj.description + "\n";
            }
            str = str.substring(0, str.length - 2);
            str += "```\n";
            str += "Admin commands require the `Bot Commander` role\n";
            str += "Use `$help commandname` for more information";
            
            msg.author.send(str);
            msg.reply("I have sent you a list of my commands!");
        }
    },
    "ping" : {
        name: "ping",
        description: "Pong!",
        category: "fun",
        usage: "$ping",
        admin: false,
        process: function(msg, bot) {
            msg.reply('Pong!');
        }
    },
    "echo": {
        name: "echo",
        description: "I'll repeat back what you said",
        category: "fun",
        usage: "$echo what you want to hear here",
        admin: false,
        process: function(msg, bot) {
            let content = msg.content.split(" ").slice(1, msg.content.split(" ").length).join(" ");
            msg.reply(content);
        }
    },
    "thonk": {
        name: "thonk",
        description: "hmmmm",
        category: "fun",
        usage: "$thonk",
        admin: false,
        process: function(msg, bot) {
            msg.reply(
                "", 
                {
                    files: [
                        root_img + "thonk/" + pics["thonk"][Math.floor(Math.random() * pics["thonk"].length)]
                    ]
                }
            );
            msg.delete();

        }
    },
    "play": {
        name: "play",
        description: "play audio from a given youtube video (search or url)",
        category: "music",
        usage: "play [url or keyword search here]",
        admin: false,
        process: function(msg, bot) {

            play(msg, bot);

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
        process: function(msg, bot) {

            skip(msg, bot);

        }
    },
    "queue": {
        name: "queue",
        description: "get the current queue of songs",
        category: "music",
        usage: "$queue",
        admin: false,
        process: function(msg, bot) {
            queue(msg, bot);

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
        process: function(msg, bot) {

            stop(msg, bot);

        }
    },
    "clear": {
        name: "clear",
        description: "clears the song queue",
        category: "music",
        usage: "$clear",
        admin: true,
        process: function(msg, bot) {

            clear(msg, bot);
            
        }
    },
    "link": {
        name: "link",
        description: "provides a link to the currently playing song",
        category: "music",
        usage: "$link",
        admin: false,
        process: function(msg, bot) {
            link(msg, bot);
            
        }
    }
    
    /*
    "": {
        name: "",
        description: "",
        usage: "",
        process: function(msg, bot) {

        }
    }
    */
}

exports.commands = commands;
