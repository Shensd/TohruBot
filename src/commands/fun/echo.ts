import * as Discord from 'discord.js';

import { ICommandParams } from '../../misc/globals';

export default function echo(params: ICommandParams) {
    params.msg.reply(params.content);
}