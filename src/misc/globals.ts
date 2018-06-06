import * as Discord from 'discord.js';

import {Message, Client, User} from 'discord.js';

export interface ICommandParams {
    msg: Message,
    bot: Client,
    user: User,
    args: string[],
    content: string
}