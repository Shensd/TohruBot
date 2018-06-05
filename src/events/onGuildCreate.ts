import * as Discord from 'discord.js';
import * as mysql from 'mysql';

import {Guild} from 'discord.js';
import {Connection} from 'mysql';

const USER: string = process.env.MYSQL_USER!;
const PASS: string = process.env.MYSQL_PASS!;

let connection: Connection;

function init() {
    connection = mysql.createConnection({
        host: 'localhost',
        user: USER,
        password: PASS,
        database: 'tohrubot'
    });
}

function addGuild(guild: Guild) {
    connection.query(
        "INSERT INTO guilds(id, prefix) VALUES (?, ?)",
        [
            guild.id,
            "$"
        ],
        (error, results, fields) => {
            if(error) throw error;

            console.log(`Added guild "${guild.name}" (${guild.id}) to database.`);
    });
}

function testForGuild(guild: Guild) {
    connection.query(
        "SELECT * FROM guilds WHERE id = ?", 
        [
            guild.id
        ],
        (error, results, fields) => {

        if(error) throw error;

        if(results.length == 0) {
            addGuild(guild);
        }

    });
}

export default function onGuildCreate(guild: Guild) {
    if(connection) {
        testForGuild(guild);
    } else {
        init();
        testForGuild(guild);
    }
}