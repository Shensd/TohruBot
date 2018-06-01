const fs = require('fs');
const Discord = require('discord.js');

const root_img = "./res/img/";

const file_pics = './res/json/pics.json';
const pics = require(file_pics);

const ytdl = require("ytdl-core");
const youtubedl = require("youtube-dl");

const music = require("./music.js")


function img_reply(msg, img) {
    msg.reply("", {files:[root_img + pics[img]]});
}


var commands = {
    "help" : {
        name: "help",
        description: "displays this output or can be used for more info on a specific command",
        category: "utility",
        usage: "$help [commandname]",
        admin: false,
        process: function(msg, bot) {
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
            for(k in commands) {
                let obj = commands[k];
                if(obj.name.length > longest_name) longest_name = obj.name.length;
            }
            for(k in commands) {
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

            music.play(msg, bot);

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

            music.skip(msg, bot);

        }
    },
    "queue": {
        name: "queue",
        description: "get the current queue of songs",
        category: "music",
        usage: "$queue",
        admin: false,
        process: function(msg, bot) {

            music.queue(msg, bot);

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

            music.stop(msg, bot);

        }
    },
    "clear": {
        name: "clear",
        description: "clears the song queue",
        category: "music",
        usage: "$clear",
        admin: true,
        process: function(msg, bot) {

            music.clear(msg, bot);
            
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
