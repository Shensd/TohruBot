const Discord = require('discord.js');
const ytdl = require("ytdl-core");
const youtubedl = require("youtube-dl");

// set this to true to get all the delicious voice debug info in console
const PLAYER_DEBUG_LOGGING = true;

class Song {
    constructor(url, info_fetched) {
        this.loaded = false;
        this.loading = false;

        let request;
        if(!ytdl.validateURL(url)) {
            request = `ytsearch:${url}`;                                          
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

            info_fetched(this);
        }); 
        search.on('error', (e) => {
            console.log(e);
        });
    }

    load() {

        if(this.loaded || this.loading) return;

        this.loading = true;

        this.stream = ytdl(this.url, {format: 'audioonly'});
        this.stream.on("readable", () => {
            this.loaded = true;
            this.loading = false;
            if(PLAYER_DEBUG_LOGGING) console.log(`${this.info.title} NOW READABLE`);
        });
        this.stream.on("error", (e) => {
            console.log(e);
        });
    }
}

class GuildMusicController {
    constructor(guild) {
        this.guild            = guild;

        this.active_stream    = null;
        this.active_song      = null;
        this.queue            = []; //filled with song objects
        this.disconnect_timer = null;
        this.last_channel     = null;
    }

    get has_active_stream() {
        return !!(this.active_stream);
    }

    get has_disconnect_timer() {
        return !!(this.disconnect_timer);
    }

    get voice_connection() {
        this.guild.voiceConnection;
    }

    clear_disconnect_timer() {
        if(this.disconnect_timer) {
            clearTimeout(this.disconnect_timer);
            this.disconnect_timer = null;
        }
    }

    start_disconnect_timer() {
        this.disconnect_timer = setTimeout(() => {

            if(this.voice_connection) {
                this.voice_connection.disconnect();
                this.last_channel.send(":x: Disconnected due to inactivity");
            }

            this.active_stream = null;
            this.disconnect_timer = null;

        }, 1 * 1000);
    }

    clear_queue() {
        this.queue = [];
    }

    pop_queue() {
        this.queue = this.queue.pop();
    }

    kill_active_stream() {
        if(this.has_active_stream) {
            this.active_stream.end("self called");
        }
        this.active_stream = null;
    }
}


let active_streams = {
    "example890283901289301": new GuildMusicController()
}

/* GUILD ACCOUNT MANAGEMENT */
function get_guild_account(guild) {
    let guild_account;

    if(!guild_account_exists(guild)) {
        guild_account = create_guild_account(guild);
    } else {
        guild_account = active_streams[guild.id];
    }

    return guild_account;
}

function guild_account_exists(guild) {
    return !!active_streams[guild.id];
}

function create_guild_account(guild) {
    active_streams[guild.id] = new GuildMusicController(guild);

    return active_streams[guild.id];
}

/**
 * Delays until a song is loaded and ready to be played
 * @param {Song} song 
 * @param {Guild} guild 
 */
function load_buffer(song, guild) {
    
    let guild_account = get_guild_account(guild);
    
    // prevent double playing of songs if current isn't loaded yet by faking an active stream
    if(!guild_account.has_active_stream) {
        if(PLAYER_DEBUG_LOGGING) console.log("NO ACTIVE STREAM, FAKING");
        guild_account.active_stream = 1;
    }

    // check if song is ready, create and play if it is or postpone if it isnt
    if(PLAYER_DEBUG_LOGGING) console.log(`LOADED ${song.loaded}`);
    if(song.loaded) {
        play_stream(song, guild);
    } else {
        song.load();
        setTimeout(() => {
            load_buffer(song, guild);
        }, 100);
        return;
    }
}

/**
 * Adds a song to a guild's queue
 * @param {Song} song 
 * @param {Message} msg 
 */
function add_to_queue(song, msg) {

    let guild_account = get_guild_account(msg.guild);

    let embed = new Discord.RichEmbed();
    embed.setThumbnail(song.info.thumbnail);
    embed.setTitle(`**${song.info.title}**`);
    embed.addField("Uploader", song.info.uploader);
    embed.addField("Length", song.info.duration);
    embed.setURL(`https://www.youtube.com/watch?v=${song.info.id}`);


    // instant play if there is no song playing, add to queue if there is,
    // modify message to fit
    if(!guild_account.has_active_stream) {
        load_buffer(song, msg.guild);

        embed.setAuthor("Now Playing", msg.author.avatarURL);
        embed.addField("Position in queue", "Playing now");
        
    } else {
        guild_account.queue.push(song);
        song.load();

        embed.setAuthor("Added to Queue", msg.author.avatarURL);
        embed.addField("Position in queue", guild_account.queue.length);
    }

    msg.channel.send(embed);

    guild_account.last_channel = msg.channel;

}

/**
 * Plays next item in a given guild's queue
 * @param {Guild} guild 
 * @param {String} origin
 */
function play_next_in_queue(guild, origin) {
 
    // allow end of stream from within method
    if(origin === "self called") return;

    // rare case error check, if there is no guild account then don't do anything
    if(!guild_account_exists(guild)) return;

    guild_account = get_guild_account(guild);

    let queue = guild_account.queue;

    guild_account.kill_active_stream();

    if(origin === "skip") {
        guild_account.last_channel.send("Song skipped :arrow_right:");
    }
    
    // don't send queue finished if it was manually destroyed
    if(queue.length == 0 && !(origin === "stop")) {
        guild_account.last_channel.send(":white_check_mark: Queue Finished");
        return;
    }

    // don't play next song if origin was stop command
    if(origin === "stop") {
        return;
    }

    load_buffer(queue[0], guild);

    guild_account.last_channel.send(
        `**Now playing** :musical_note: \`${guild_account["active_song"].info.title}\` :musical_note:`
    );

    guild_account.pop_queue();
}

/**
 * Plays a song in a given guild
 * @param {Song} song 
 * @param {Guild} guild 
 */
function play_stream(song, guild) {
    let guild_account = get_guild_account(guild);
    let connection = guild.voiceConnection;

    let stream = song.stream;

    let streamOptions = {seek: 0, volume: 1};

    // clear auto disconnect since we are now active again
    if(guild_account.has_disconnect_timer) {
        guild_account.clear_disconnect_timer();
    }

    guild_account.active_song = song; 
    guild_account.active_stream = connection.playStream(stream, streamOptions);

    if(PLAYER_DEBUG_LOGGING) console.log(`PLAYING ${guild_account["active_song"].info.title}`);

    guild_account.active_stream.on('error', e => {
        console.log(e);
    });
    guild_account.active_stream.on('speaking', e => {
        if(PLAYER_DEBUG_LOGGING) console.log(`SPEAKING ${e}`);
    });

    guild_account.active_stream.on('end', reason => {
        if(PLAYER_DEBUG_LOGGING) console.log(`ENDED ${guild_account["active_song"].info.title}`);
        // 5 minutes of no activity and bot leaves voice channel
        guild_account.start_disconnect_timer();
        
        if(PLAYER_DEBUG_LOGGING) console.log(`REASON ${reason}`);
        play_next_in_queue(guild, reason);

    });
}

/* USER COMMANDS */

function command_play(msg, bot) {
    // refuse if dm 
    if(!msg.guild) return;

    // remove play command from request
    let video_desc = msg.content.split(" ").slice(1, msg.content.split(" ").length).join(" ");

    // no search or url given
    if(video_desc.length <= 0) {
        msg.channel.send(":bread: No url or search query provided");
        return;
    }

    // input too long
    if(video_desc.length > 200) {
        msg.channel.send(":bread: Search query longer than 200 characters");
        return;
    }

    // strip new lines (messes up youtube-dl)
    video_desc.replace("\n", "");

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
        if(guild_account_exists(msg.guild) && (get_guild_account(msg.guild).active_stream != null)) {
            msg.channel.send(":x: User not in same voice channel as bot");
            return;
        }
    }

    // use existing voice connection if it exists, otherwise create new one
    if(msg.guild.voiceConnction) {
        add_to_queue(song, msg);
    } else {
        if(vc.joinable) {
            vc.join()
                .then((connection) => {
    
                    let song = new Song(video_desc, (song) => {
                        add_to_queue(song, msg);
                    });
    
                })
                .catch((e) => {
                    console.log(e);
                });
        } else {
            msg.channel.send(":x: Unable to join voice channel");
        }
    }
}

function command_skip(msg, bot) {
    // refuse if dm 
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
        if(guild_account_exists(msg.guild) && (get_guild_account(msg.guild)["active"] != null) ) {
            msg.channel.send(":x: User not in same voice channel as bot");
            return;
        }
    }

    // if there is no guild account then nothing is playing
    if(!guild_account_exists(msg.guild)) {
        msg.channel.send(":x: There is nothing being played");
        return;
    }

    // if there is no active stream then nothing is playing
    let guild_account = get_guild_account(msg.guild);
    if(guild_account.active_stream == null) {
        msg.channel.send(":x: There is nothing being played");
        return;
    }

    // if there is a guild account and stream, skip it
    guild_account.active_stream.end("skip");

    guild_account.last_channel = msg.channel;
}

function command_queue(msg, bot, tries) {
    // refuse if dm 
    if(!msg.guild) return;

    // if there is no guild account, or we have reached the max 
    // amount of retries, empty queue
    if(!guild_account_exists(msg.guild) || tries > 10) {
        msg.channel.send(":x: There are no songs in the queue.");
        return;
    }

    let guild_account = get_guild_account(msg.guild);

    // if there is no active song postpone and retry (song 
    // could still be loading)
    if(guild_account.active_song == null) {
        setTimeout(() => {
            if(tries == null) tries = 0;
            this.queue(msg, bot, tries+1);
        }, 100);
        return;
    } 

    let queue = guild_account.queue;
    let embed = new Discord.RichEmbed();

    embed.addField("Currently Playing", guild_account.active_song.info.title);
    embed.setThumbnail(guild_account.active_song.info.thumbnail);

    if(queue.length > 0) {
        let message = "";

        // print queue items up to 5
        for(let i = 0; i < ((queue.length > 5) ? 5 : queue.length); i++) {
            message += "" + (i+1) + ". " + queue[i].info.title + "\n";
        }
        message += "...";
        embed.addField("Queue", message);
    } else {
        embed.addField("Queue", "No videos in queue");
    }

    msg.channel.send(embed);

    guild_account.last_channel = msg.channel;
}

function command_voteskip(msg, bot) {
    // refuse if dm 
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

function command_stop(msg, bot) {
    // refuse if dm 
    if(!msg.guild) return;
    if(guild_account_exists(msg.guild)) {
        let guild_account = get_guild_account(msg.guild);
        guild_account.clear_queue();
        guild_account.kill_active_stream();
        guild_account.voice_connection.disconnect();
        msg.channel.send(":octagonal_sign: Queue cleared and disconnected from voice channel");

        guild_account.last_channel = msg.channel;

    // rare case where bot is in voice channel with no guild account,
    // happens on bot restart
    } else if (msg.guild.me.voiceChannel) {
        msg.guild.me.voiceChannel.join().then((c) => {
            c.disconnect();
        });
        msg.channel.send(":octagonal_sign: Queue cleared and disconnected from voice channel");
    }
}

function command_clear(msg, bot) {
    // refuse if dm 
    if(!msg.guild) return;

    if(guild_account_exists(msg.guild)) {
        let guild_account = get_guild_account(msg.guild);
        guild_account.clear_queue();
        msg.channel.send(":white_check_mark: Queue cleared");

        guild_account.last_channel = msg.channel;
    }
}

function command_link(msg, bot, tries) {
    if(!msg.guild) return;

    // nothing playing if there is no guild account or we have reached max retries
    if(!guild_account_exists(msg.guild) || ((tries == null) ? 0 : tries) > 10) {
        msg.channel.send(":x: Nothing currently playing."); 
        return;
    }
    
    let guild_account = get_guild_account(msg.guild);


    // if there is an active stream but no song info, wait and retry until there is
    if(guild_account.has_active_stream) {

        if(!guild_account.active_song.info) {
            setTimeout(() => {
                if(tries == null) tries = 0;
                this.link(msg, bot, tries+1);
            }, 100);
            return;
        } 

        let song = guild_account.active_song;

        let embed = new Discord.RichEmbed();
        embed.setThumbnail(song.info.thumbnail);
        embed.setTitle(`**${song.info.title}**`);
        embed.setAuthor("Currently Playing", msg.author.avatarURL);
        embed.addField("Uploader", song.info.uploader);
        embed.addField("Length", song.info.duration);
        embed.setURL(`https://www.youtube.com/watch?v=${song.info.id}`);

        msg.channel.send(embed);
    } else {
        msg.channel.send(":x: Nothing currently playing");
    }
    
}

// node exports
module.exports.play     = command_play;
module.exports.skip     = command_skip;
module.exports.queue    = command_queue;
module.exports.voteskip = command_voteskip;
module.exports.stop     = command_stop;
module.exports.clear    = command_clear;
module.exports.link     = command_link;