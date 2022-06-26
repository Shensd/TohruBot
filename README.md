# Tohru Bot

![Banner](./res/img/banner.png)

Another Discord Music Bot

Tohru bot is the only™ Discord bot (not really) that plays music from Youtube, either through given links or search queries.

## How do I add it?

Tohru is not yet ready to be added to servers, but this repository can be pulled and ran locally, simply rename `/res/auth/example_auth.json` to `/res/auth/auth.json` and replace the given entry with your bot token.

Tohru runs off of [Node.js](https://nodejs.org/en/) and it will need to be installed on the running system.

Once node is installed the bot can then be ran with `node bot.js`

## Documentation

Admin commands require the user to have the `Bot Commander` role, this role requires no extra permissions the name is the only important part.

Below admin commands are marked with a `*`, which is not included when issuing the command. 

```
 $help
  |- DM's the user a list of Tohru's commands
 $echo [input]
  |- Repeats back the given input (plox don't abuse)
 $thonk
  |- hmmm
 $play [url/query]
  |- Used to play a given Youtube link or search
*$skip 
  |- Skips the currently playing song
 $queue
  |- Lists the songs currently queued up to be played
*$stop
  |- Clears queue and disconnects Tohru from voice channel
*$clear
  |- Clears all songs from the queue
 $link
  |- gives a small summary and link to currently playing song
``` 

## Future Plans

The current list of planned commands are as follows
* Voteskip
	* Creates vote for the users of the active voice channel to skip the currently playing song
*  Various Image/Reaction Commands
*  Anime search 
*  Various smaller fun commands
	*  Diceroll
	*  Lotto
	*  RateMyWaifu

###### This project is licensed under the MIT open source license, see LICENSE for more details
