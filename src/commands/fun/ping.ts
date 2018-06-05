import * as Discord from 'discord.js';

import { ICommandParams } from '../../misc/globals';

export default function ping(params: ICommandParams) {
    params.msg.reply("Pong!");
}