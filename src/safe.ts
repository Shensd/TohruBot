import { Channel, Message, TextChannel, Collection } from "discord.js";

export function safeDeleteMessage(channel: Channel, messages: Message | Message[], informUser: boolean = false){
    if (!(channel instanceof TextChannel)){
        // for convenience, we don't want to cast every single channel object
        // to TextChannel whenever we want to delete something 
        return;         
    }

    if (!Array.isArray(messages)){
        messages = [messages];
    }
    
    const msg = messages[0]        
    const sender = msg.author.username;
    
    if (!channel.guild.me.hasPermission('MANAGE_MESSAGES') && msg.member !== msg.guild.me){
        console.log(`Could not delete message(s) from user ${sender}, missing permissions.`);
        if (informUser){
            // channel is not guaranteed to always be the same channel
            // the message is sent from. Shouldn't be sending error messages
            // to different channels.
            msg.channel.send(`I need \`Manage Messages\` permission to delete messages from other users.`);
        }
        return;
    }

    const deletableMessages = messages.filter(message => message.deletable);
    
    channel.bulkDelete(deletableMessages)
        .then((collection: Collection<string, Message>) => {
            if (informUser){
                msg.channel.send(`Deleted ${collection.size} message${collection.size != 1 ? 's' : ''}`)
            }
        })
        .catch(console.error)        
}