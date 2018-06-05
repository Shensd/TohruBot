import * as Discord from 'discord.js';

interface IMode {
    name: string;
    args: string[];
    description: string;
    activated: boolean;
}

export default function onDebug(info: string, modes: {[key: string]: IMode}) {
    if(modes.debug.activated) {
        console.log(info);
    }
}