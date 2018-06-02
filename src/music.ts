const Discord = require('discord.js');
import * as ytdl from 'ytdl-core'
import * as youtubedl from 'youtube-dl'
import { Readable } from 'stream';
import { Guild, VoiceChannel, TextChannel, Message, StreamDispatcher, VoiceConnection, Client } from 'discord.js';

// set this to true to get all the delicious voice debug info in console
const PLAYER_DEBUG_LOGGING = true;

class Song {
    loaded: boolean;
    loading: boolean;
    info?: any;
    stream?: Readable;

    // declaring 'public' in the constructor in TS automatically adds 
    // the property to the class without doing 'this.url = url'
    constructor(public url: string, info_fetched: (song: Song) => any) {
        this.loaded = false;
        this.loading = false;

        let request;
        if(!ytdl.validateURL(url)) {
            request = `ytsearch:${url}`;
        } else {
            request = url;
        }

        //@ts-ignore
        let search = youtubedl(
            request,
            ["--skip-download"]
        );

        search.on('info', (info: any) => {
            this.info = info;
            console.log(info);
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

        this.stream = ytdl(this.url, {filter: 'audioonly'});
        this.stream.on("readable", () => {
            this.loaded = true;
            this.loading = false;
            //@ts-ignore
            if(PLAYER_DEBUG_LOGGING) console.log(`${this.info.title} NOW READABLE`);
        });
        this.stream.on("error", (e) => {
            console.log(e);
        });
    }
}

class GuildMusicController {
    guild: Guild;
    disconnectTimer: NodeJS.Timer | null;
    lastChannel: TextChannel | null;
    queue: Song[];
    activeSong: Song | null;
    activeStream: StreamDispatcher | null | 1;
    constructor(guild: Guild) {
        this.guild            = guild;
        this.activeStream    = null;
        this.activeSong      = null;
        this.queue            = []; //filled with song objects
        this.disconnectTimer = null;
        this.lastChannel     = null;
    }

    get hasActiveStream() {
        return !!(this.activeStream);
    }

    get hasDisconnectTimer() {
        return !!(this.disconnectTimer);
    }

    get hasVoiceConnection() {
        return !!(this.guild.voiceConnection);
    }

    get voiceConnection() {
        return this.guild.voiceConnection;
    }

    clearDisconnectTimer() {
        if(this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
            this.disconnectTimer = null;
        }
    }

    startDisconnectTimer() {
        this.disconnectTimer = setTimeout(() => {
            // 
            if(this.voiceConnection && this.lastChannel) {
                this.voiceConnection.disconnect();
                this.lastChannel.send(":x: Disconnected due to inactivity");
            }
            else if (this.voiceConnection && !this.lastChannel){
                console.log('No channel was recorded upon timing out');
            }

            this.activeStream = null;
            this.disconnectTimer = null;

        }, 300 * 1000);
    }

    clearQueue() {
        this.queue = [];
    }

    popQueue() {
        this.queue.shift();
    }

    killActiveStream() {
        if(this.activeStream instanceof StreamDispatcher) {
            this.activeStream.end("self called");
        }
        this.activeStream = null;
    }
}


let activeStreams: {[guild: string]: GuildMusicController} = {}

/* GUILD ACCOUNT MANAGEMENT */
function getGuildAccount(guild: Guild): GuildMusicController {
    let guildAccount;

    if(!guildAccountExists(guild)) {
        return createGuildAccount(guild);
    }

    return activeStreams[guild.id];
}

function guildAccountExists(guild: Guild) {
    return !!activeStreams[guild.id];
}

function createGuildAccount(guild: Guild) {
    activeStreams[guild.id] = new GuildMusicController(guild);

    return activeStreams[guild.id];
}

/**
 * Delays until a song is loaded and ready to be played
 * @param {Song} song 
 * @param {Guild} guild 
 */
function loadBuffer(song: Song, guild: Guild) {
    let guildAccount = getGuildAccount(guild);
    
    // check if song is ready, create and play if it is or postpone if it isnt
    if(song.loaded) {
    if(PLAYER_DEBUG_LOGGING) console.log(`LOADED ${song.loaded}`);        
        playStream(song, guild);
    } else {
        song.load();
        setTimeout(() => {
            loadBuffer(song, guild);
        }, 100);
    }
}

/**
 * Adds a song to a guild's queue
 * @param {Song} song 
 * @param {Message} msg 
 */
function addToQueue(song: Song, msg: Message) {

    let guildAccount = getGuildAccount(msg.guild);

    let embed = new Discord.RichEmbed();
    embed.setThumbnail(song.info.thumbnail);
    embed.setTitle(`**${song.info.title}**`);
    embed.addField("Uploader", song.info.uploader);
    embed.addField("Length", song.info.duration);
    embed.setURL(`https://www.youtube.com/watch?v=${song.info.id}`);


    // instant play if there is no song playing, add to queue if there is,
    // modify message to fit
    if(!guildAccount.hasActiveStream) {
        loadBuffer(song, msg.guild);

        embed.setAuthor("Now Playing", msg.author.avatarURL);
        embed.addField("Position in queue", "Playing now");
        
    } else {
        guildAccount.queue.push(song);
        song.load();

        embed.setAuthor("Added to Queue", msg.author.avatarURL);
        embed.addField("Position in queue", guildAccount.queue.length);
    }

    msg.channel.send(embed);

    // channel is of type Channel, we're casting it to TextChannel as it 
    // inherits from Channel
    guildAccount.lastChannel = <TextChannel> msg.channel;

}

/**
 * Plays next item in a given guild's queue
 * @param {Guild} guild 
 * @param {String} origin
 */
function playNextInQueue(guild: Guild, origin?: string) {
 
    // allow end of stream from within method
    if(origin === "self called") return;

    // rare case error check, if there is no guild account then don't do anything
    if(!guildAccountExists(guild)) return;

    const guildAccount = getGuildAccount(guild);

    let queue = guildAccount.queue;

    guildAccount.killActiveStream();

    if(origin === "skip" && guildAccount.lastChannel) {
        guildAccount.lastChannel.send("Song skipped :arrow_right:");
    }
    
    // don't send queue finished if it was manually destroyed
    if(queue.length == 0 && !(origin === "stop") && guildAccount.lastChannel) {
        guildAccount.lastChannel.send(":white_check_mark: Queue Finished");
        return;
    }

    // don't play next song if origin was stop command
    if(origin === "stop") {
        return;
    }

    loadBuffer(queue[0], guild);

    if (guildAccount.lastChannel)
        guildAccount.lastChannel.send(
            `**Now playing** :musical_note: \`${guildAccount["activeSong"]!.info.title}\` :musical_note:`
        );

    guildAccount.popQueue();
}

/**
 * Plays a song in a given guild
 * @param {Song} song 
 * @param {Guild} guild 
 */
function playStream(song: Song, guild: Guild) {
    let guildAccount = getGuildAccount(guild);
    let connection = guild.voiceConnection;

    let stream = song.stream;

    let streamOptions = {seek: 0, volume: 1};

    // clear auto disconnect since we are now active again
    // but no need to check twice
    guildAccount.clearDisconnectTimer();

    guildAccount.activeSong = song; 

    if (stream){
        guildAccount.activeStream = connection.playStream(stream, streamOptions);
        if(PLAYER_DEBUG_LOGGING) console.log(`PLAYING ${guildAccount["activeSong"]!.info.title}`);

        guildAccount.activeStream.on('error', (e: Error) => {
            console.log(e);
        });
        guildAccount.activeStream.on('speaking', e => {
            if(PLAYER_DEBUG_LOGGING) console.log(`SPEAKING ${e}`);
        });

        guildAccount.activeStream.on('end', reason => {
            if(PLAYER_DEBUG_LOGGING) console.log(`ENDED ${guildAccount["activeSong"]!.info.title}`);
            // 5 minutes of no activity and bot leaves voice channel
            guildAccount.startDisconnectTimer();
            
            if(PLAYER_DEBUG_LOGGING) console.log(`REASON ${reason}`);
            playNextInQueue(guild, reason);

        });
    }
    else 
        console.log('stream was not found')
    
    
}

/* USER COMMANDS */

export function commandPlay(msg: Message, bot: Client) {
    // refuse if dm 
    if(!msg.guild) return;

    // remove play command from request
    let videoDesc = msg.content.split(" ").slice(1, msg.content.split(" ").length).join(" ");

    // no search or url given
    if(videoDesc.length <= 0) {
        msg.channel.send(":bread: No url or search query provided");
        return;
    }

    // input too long
    if(videoDesc.length > 200) {
        msg.channel.send(":bread: Search query longer than 200 characters");
        return;
    }

    // strip new lines (messes up youtube-dl)
    videoDesc.replace("\n", "");

    let VC = msg.member.voiceChannel;
    let meVC = msg.guild.me.voiceChannel;

    // dont let users not in voice channels play songs
    if(VC == null) {
        msg.channel.send(":x: User not in voice channel");
        return;
    }

    // dont let users in a different voice channel play songs
    // while bot is currently playing in another
    if(meVC != VC) {
        if(guildAccountExists(msg.guild) && (getGuildAccount(msg.guild).activeStream != null)) {
            msg.channel.send(":x: User not in same voice channel as bot");
            return;
        }
    }

    // use existing voice connection if it exists, otherwise create new one
    if(msg.guild.voiceConnection) {
        let song = new Song(videoDesc, (song) => {
            addToQueue(song, msg);
        });
    } else {
        if(VC.joinable) {
            VC.join()
                .then((connection: VoiceConnection) => {
    
                    let song = new Song(videoDesc, (song) => {
                        addToQueue(song, msg);
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

export function commandSkip(msg: Message, bot: Client) {
    // refuse if dm 
    if(!msg.guild) return;

    let VC = msg.member.voiceChannel;
    let meVC = msg.guild.me.voiceChannel;

    // dont let users not in voice channels skip songs
    if(VC == null) {
        msg.channel.send(":x: User not in voice channel");
        return;
    }

    // dont let users in a different voice channel skip songs
    // while bot is currently playing in another
    if(meVC != VC) {
        if(guildAccountExists(msg.guild) && (getGuildAccount(msg.guild)) ) {
            msg.channel.send(":x: User not in same voice channel as bot");
            return;
        }
    }

    // if there is no guild account then nothing is playing
    if(!guildAccountExists(msg.guild)) {
        msg.channel.send(":x: There is nothing being played");
        return;
    }

    // if there is no active stream then nothing is playing
    let guildAccount = getGuildAccount(msg.guild);
    if(guildAccount.activeStream == null) {
        msg.channel.send(":x: There is nothing being played");
        return;
    }

    // if there is a guild account and stream, skip it
    if (guildAccount.activeStream instanceof StreamDispatcher)
        guildAccount.activeStream.end("skip");

    guildAccount.lastChannel = <TextChannel> msg.channel;
}

export function commandQueue(msg: Message, bot: Client, tries?: number) {
    // refuse if dm 
    if(!msg.guild) return;

    // if there is no guild account, or we have reached the max 
    // amount of retries, empty queue
    if(!guildAccountExists(msg.guild) || (tries && tries > 10)) {
        msg.channel.send(":x: There are no songs in the queue.");
        return;
    }
    
    let guildAccount = getGuildAccount(msg.guild);

    // if there is no active song postpone and retry (song 
    // could still be loading)
    if(guildAccount.activeSong == null) {
        setTimeout(() => {
            if(tries == null) tries = 0;
            return commandQueue(msg, bot, tries+1);
        }, 100);
        return;
    } 

    let queue = guildAccount.queue;
    let embed = new Discord.RichEmbed();

    embed.addField("Currently Playing", guildAccount.activeSong.info.title);
    embed.setThumbnail(guildAccount.activeSong.info.thumbnail);

    if(queue.length > 0) {
        let message = "";

        // print queue items up to 5
        for(let i = 0; i < ((queue.length > 5) ? 5 : queue.length); i++) {
            message += "" + (i+1) + ". " + queue[i].info.title + "\n";
        }

        if(queue.length > 5) message += "...";
        
        embed.addField("Queue", message);
    } else {
        embed.addField("Queue", "No videos in queue");
    }

    msg.channel.send(embed);

    guildAccount.lastChannel = <TextChannel> msg.channel;
}

export function commandVoteSkip(msg: Message, bot: Client) {
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

export function commandStop(msg: Message, bot: Client) {
    // refuse if dm 
    if(!msg.guild) return;
    if(guildAccountExists(msg.guild)) {
        let guildAccount = getGuildAccount(msg.guild);
        guildAccount.clearQueue();
        guildAccount.killActiveStream();
        guildAccount.voiceConnection.disconnect();
        msg.channel.send(":octagonal_sign: Queue cleared and disconnected from voice channel");

        guildAccount.lastChannel = <TextChannel> msg.channel;

    // rare case where bot is in voice channel with no guild account,
    // happens on bot restart
    } else if (msg.guild.me.voiceChannel) {
        msg.guild.me.voiceChannel.join().then((c) => {
            c.disconnect();
        });
        msg.channel.send(":octagonal_sign: Queue cleared and disconnected from voice channel");
    }
}

export function commandClear(msg: Message, bot: Client) {
    // refuse if dm 
    if(!msg.guild) return;

    if(guildAccountExists(msg.guild)) {
        let guildAccount = getGuildAccount(msg.guild);
        guildAccount.clearQueue();
        msg.channel.send(":white_check_mark: Queue cleared");

        guildAccount.lastChannel = <TextChannel> msg.channel;
    }
}

export function commandLink(msg: Message, bot: Client, tries?: number){
    if(!msg.guild) return;

    // nothing playing if there is no guild account or we have reached max retries
    if(!guildAccountExists(msg.guild) || ((tries == null) ? 0 : tries) > 10) {
        msg.channel.send(":x: Nothing currently playing."); 
        return;
    }
    
    let guildAccount = getGuildAccount(msg.guild);


    // if there is an active stream but no song info, wait and retry until there is
    if(guildAccount.hasActiveStream) {

        if(!guildAccount.activeSong!.info) {
            setTimeout(() => {
                if(tries == null) tries = 0;
                return commandLink(msg, bot, tries+1);
            }, 100);
            return;
        } 
        
        
        let song = guildAccount.activeSong!;

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
module.exports.play     = commandPlay;
module.exports.skip     = commandSkip;
module.exports.queue    = commandQueue;
module.exports.voteskip = commandVoteSkip;
module.exports.stop     = commandStop;
module.exports.clear    = commandClear;
module.exports.link     = commandLink;