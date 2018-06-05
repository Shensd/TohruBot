import * as Discord from 'discord.js';

import { ICommandParams } from '../../misc/globals';

const root_img = "../res/img/";

const file_pics = '../res/json/pics.json';
const pics = require(file_pics);

export default function thonk(params: ICommandParams) {
    params.msg.reply(
        {
            files: [
                root_img + "thonk/" + pics["thonk"][Math.floor(Math.random() * pics["thonk"].length)]
            ]
        }
    );
    params.msg.delete();
}