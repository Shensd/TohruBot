export interface IMode {
    name: string;
    args: string[];
    description: string;
    activated: boolean;
}

let modes: {[key: string]: IMode} = {
    debug: {
        name: "Debug Mode",
        args: ["-d", "--debug"],
        description: "Activates debug mode in the api, logs all debug into to the console",
        activated: false
    },
    lock: {
        name: "Locked Mode",
        args: ["-l", "--lock", "--locked"],
        description: "Activates lock mode, bot is online but will not respond to commands",
        activated: false
    },
    help: {
        name: "Help",
        args: ["-h", "--help"],
        description: "Displays the help dialog",
        activated: false
    },
    reset: {
        name: "reset",
        args: ["-r", "--reset"],
        description: "Resets the bot's name and avatar to what was specified in the config",
        activated: false
    }
}

export function getModes(): {[key: string]: IMode} {
    let args: string[] = process.argv.slice(1, process.argv.length);

    for(let i = 0; i < args.length; i++) {

        for(let modeIndex in modes) {
            const mode = modes[modeIndex];

            for(let j = 0; j < mode.args.length; j++) {
                if(args[i] == mode.args[j]) {
                    mode.activated = true;
                    console.log(mode.name + " enabled.");
                    break;
                }
            }

        }   

    }
    return modes;
}