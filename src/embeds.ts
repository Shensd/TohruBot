import { RichEmbed } from "discord.js";
import { GuildMusicController, Song } from "./music";

export namespace MusicEmbeds {
    export function queueEmbed(controller: GuildMusicController): RichEmbed {
        const embed =  new RichEmbed()

        embed.addField("Currently Playing", controller.activeSong!.info.title);
        embed.setThumbnail(controller.activeSong!.info.thumbnail);
    
        if(controller.queue.length > 0) {
            let message = "";
            
            // print queue items up to 5
            for(let i = 0; i < ((controller.queue.length > 5) ? 5 : controller.queue.length); i++) {
                message += "" + (i+1) + ". " + controller.queue[i].info.title + "\n";
            }
    
            if(controller.queue.length > 5) message += "...";
            
            embed.addField("Queue", message);
        } else {
            embed.addField("Queue", "No videos in queue");
        }
        return embed;
    }

    export function linkEmbed(controller: GuildMusicController, song: Song, avatarURL: string): RichEmbed {
        return new RichEmbed()
            .setThumbnail(song.info.thumbnail)
            .setTitle(`**${song.info.title}**`)
            .setAuthor("Currently Playing", avatarURL)
            .addField("Uploader", song.info.uploader)
            .addField("Length", song.info.duration)
            .setURL(`https://www.youtube.com/watch?v=${song.info.id}`)
    }
}