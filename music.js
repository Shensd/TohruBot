const Discord = require('discord.js');
const ytdl = require("ytdl-core");
const youtubedl = require("youtube-dl");

class Song {
    constructor(url, fetched) {
        this.preloaded = false;

        let request;
        if(!ytdl.validateURL(url)) {
            request = "ytsearch:" + url;                                          
        } else {
            request = url;
        }

        let search = youtubedl(
            request,
            ["--skip-download"]
        );

        search.on('info', (info) => {
            this.info = info;
            this.url = info.id;
            fetched(this);
        }); 
    }

    preload() {
        
        this.stream = ytdl(this.url, {format: 'audioonly'});
        this.preloaded = true;

    }
}

/*

    Turn this into a mysql database using JSON.stringify to convert object to text and then
    JSON.parse to convert it back to an object

    if we do this we cannot store the preloaded streams, to combat this we will probably
    have to preload only one and store the actual request as its raw url or search
    query form

    voice connections cannot be converted to json, but we can store voice channels 
    as guild channel ids and then join later (storage of voice connection probably isn't 
    even necessary)

    the active song needs to stay loaded into memory, since its an active stream

    breakdown ->


    DATABASE

        TABLE streams:
            guild_id   guild_channel_id   song_queue

    MEMORY

        OBJECT active_streams
            guild_id {
                voice_connection
                active_music_stream
            }

*/

let active_streams = {
    "example890283901289301": {
        "active": null,
        "active_song": null,
        "vc": null,
        "queue": [], //filled with song objects
        "disconnect": null,
        "last_msg": null
    }
}

function play_next(guild, reason, msg) {
    if(reason === "self called") return;

    if(!guild_account_exists(guild)) return;

    guild_account = get_guild_account(guild);

    let queue = guild_account["queue"];

    guild_account["active"].end("self called");
    guild_account["active"] = null;

    if(reason === "skip") {
        msg.channel.send("Song skipped :arrow_right:");
    }
    
    if(queue.length == 0) {
        guild_account["last_channel"].send(":white_check_mark: Queue Finished");
        return;
    }

    create_and_play(queue[0], guild, guild_account["vc"]);

    guild_account["last_channel"].send(`**Now playing** :musical_note: \`${guild_account["active_song"].info.title}\` :musical_note:`);

    guild_account["queue"] = queue.slice(1, queue.length);
}

function get_guild_account(guild) {
    return active_streams[guild.id];
}

function guild_account_exists(guild) {
    return (active_streams[guild.id]) ? true : false
}

function create_guild_account(guild, connection) {
    active_streams[guild.id] = {
        "active": null,
        "active_song": null,
        "vc": connection,
        "queue": [],
        "disconnect": null,
        "last_channel": null
    };

    return active_streams[guild.id];
}

function create_and_play(song, guild, connection) {

    // use stream if loaded or post-pone if not
    if(song.preloaded) {
        stream = song.stream;
    } else {
        setTimeout(() => {
            create_and_play(song, guild, connection);
        }, 100);
        return;
    }

    let streamOptions = {seek: 0, volume: 1};

    guild_account = get_guild_account(guild);

    if(guild_account["active"] == null) {

        if(guild_account["disconnect"] != null) {
            clearTimeout(guild_account["disconnect"]);
        }
        
        guild_account["active"] = connection.playStream(stream, streamOptions);

        guild_account["active"].on('error', e => {
            console.log(e);
        });

        guild_account["active"].on('end', reason => {
            guild_account["disconnect"] = setTimeout(() => {
                guild_account["vc"].disconnect();
                guild_account["active"] = null;
                guild_account["active_song"] = null;
                guild_account["last_channel"].send(":x: Disconnected due to inactivity");
            }, 300 * 1000);
            
            play_next(guild, reason);

        });

        guild_account["active_song"] = song;

    } 
}

function add_to_queue(song, msg, connection) {
    let guild_account;
    if(!guild_account_exists(msg.guild)) {
        guild_account = create_guild_account(msg.guild, connection);
    } else {
        guild_account = get_guild_account(msg.guild);
    }

    let embed = new Discord.RichEmbed();
    embed.setThumbnail(song.info.thumbnail);
    embed.setTitle(`**${song.info.title}**`);
    embed.addField("Uploader", song.info.uploader);
    embed.addField("Length", song.info.duration);
    embed.setURL("https://www.youtube.com/watch?v=" + song.info.id);

    if(guild_account["active"] == null) {
        song.preload();
        create_and_play(song, msg.guild, connection);

        embed.setAuthor("Now Playing", msg.author.avatarURL);
        embed.addField("Position in queue", "Playing now");
        
    } else {
        guild_account["queue"].push(song);
        song.preload();

        embed.setAuthor("Added to Queue", msg.author.avatarURL);
        embed.addField("Position in queue", guild_account["queue"].length);
    }

    msg.channel.send(embed);

    guild_account["last_channel"] = msg.channel;

}

function play(msg, bot) {
    let video_desc = msg.content.split(" ").slice(1, msg.content.split(" ").length).join(" ");

    if(!msg.guild) return;

    if(video_desc.length <= 0) {
        msg.channel.send(":bread: No url or search query provided");
        return;
    }

    let vc = msg.member.voiceChannel;
    let me_vc = msg.guild.me.voiceChannel;

    // dont let users not in voice channels play songs
    if(vc == null) {
        msg.channel.send(":x: User not in voice channel");
        return;
    }

    // dont let users in a different voice channel play songs
    // while bot is currently playing in another
    if(me_vc != vc) {
        if(guild_account_exists(msg.guild)) {
            if(get_guild_account(msg.guild)["active"] != null) {
                msg.channel.send(":x: User not in same voice channel as bot");
                return;
            }
        }
    }

    if(vc.joinable) {
        vc.join()
            .then((connection) => {

                let song = new Song(video_desc, (song) => {
                    add_to_queue(song, msg, connection);
                });

            })
            .catch( (e) => {
                console.log(e);
            });
    } else {
        msg.channel.send(":x: Unable to join voice channel");
    }
}

function skip(msg, bot) {
    if(!msg.guild) return;

    let vc = msg.member.voiceChannel;
    let me_vc = msg.guild.me.voiceChannel;

    // dont let users not in voice channels skip songs
    if(vc == null) {
        msg.channel.send(":x: User not in voice channel");
        return;
    }

    // dont let users in a different voice channel skip songs
    // while bot is currently playing in another
    if(me_vc != vc) {
        if(guild_account_exists(msg.guild)) {
            if(get_guild_account(msg.guild)["active"] != null) {
                msg.channel.send(":x: User not in same voice channel as bot");
                return;
            }
        }
    }

    if(!guild_account_exists(msg.guild)) {
        msg.channel.send(":x: There is nothing being played");
        return;
    }

    let guild_account = get_guild_account(msg.guild);
    if(guild_account["active"] == null) {
        msg.channel.send(":x: There is nothing being played");
        return;
    }

    play_next(msg.guild, "skip", msg);

    guild_account["last_channel"] = msg.channel;
}

function queue(msg, bot) {
    if(!msg.guild) return;

    if(!guild_account_exists(msg.guild)) {
        msg.channel.send(":x: There are no songs in the queue.");
        return;
    }

    let guild_account = get_guild_account(msg.guild);
    let queue = guild_account["queue"];

    let embed = new Discord.RichEmbed();

    embed.addField("Currently Playing", guild_account["active_song"].info.title);
    embed.setThumbnail(guild_account["active_song"].info.thumbnail);

    if(queue.length > 0) {
        let message = "";

        for(let i = 0; i < ((queue > 5) ? 5 : queue.length); i++) {
            message += "" + (i+1) + ". " + queue[i].info.title + "\n";
        }
        
        embed.addField("Queue", message);
    } else {
        embed.addField("Queue", "No videos in queue");
    }

    msg.channel.send(embed);

    guild_account["last_channel"] = msg.channel;
}

function voteskip(msg, bot) {
    if(!msg.guild) return;
    /*
                voteskip process:
                    check if bot is currently playing in a voice channel
                    check if user who called is in same voice channel
                    get number of people in voice channel
                    get number of votes required for half of voice channel
                        round down if an odd number
                        auto skip if 3 or less people in voice channel
                    open a vote for 30 seconds
                    if number of votes required is met, skip song
        
            */
}

function stop(msg, bot) {
    if(!msg.guild) return;
    if(guild_account_exists(msg.guild)) {
        let guild_account = get_guild_account(msg.guild);
        guild_account["queue"] = [];
        guild_account["active"].end("stop");
        guild_account["vc"].disconnect();
        msg.channel.send(":octagonal_sign: Queue cleared and disconnected from voice channel");

        guild_account["last_channel"] = msg.channel;
    }
}

function clear(msg, bot) {
    if(!msg.guild) return;
    if(guild_account_exists(msg.guild)) {
        let guild_account = get_guild_account(msg.guild);
        guild_account["queue"] = [];
        msg.channel.send(":white_check_mark: Queue cleared");

        guild_account["last_channel"] = msg.channel;
    }
}

module.exports.play = play;
module.exports.skip = skip;
module.exports.queue = queue;
module.exports.voteskip = voteskip;
module.exports.stop = stop;
module.exports.clear = clear;