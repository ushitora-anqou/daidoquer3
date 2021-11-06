import { Client, ClientOptions, Interaction, GuildMember, Snowflake } from 'discord.js';
import config from './config/config.json';
import { MusicSubscription } from './music/subscription';
import { AudioPlayerStatus, AudioResource, entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { Track } from './music/track/track';
import { generateDependencyReport } from '@discordjs/voice';
import { Register } from './commands/register';
import { Url2Enqueue } from './music/url2enqueue';

console.log(generateDependencyReport());
const options: ClientOptions = {
    intents: ['GUILD_VOICE_STATES', 'GUILD_MESSAGES', 'GUILDS']
}
const client = new Client(options);

client.on('ready', () => console.log('Ready!'));

const guild2subscriptions = new Map<Snowflake, MusicSubscription>();

new Register(client, config.prefix);

// Handles slash command interactions
client.on('interactionCreate', async (interaction: Interaction) => {
	if (!interaction.isCommand() || !interaction.guildId) return;
	let subscription = guild2subscriptions.get(interaction.guildId);

	if (interaction.commandName === 'play') {
		// Extract the video URL from the command
		if (!interaction.options.get('song')?.value) return;
		const url = interaction.options.get('song')?.value as string;

		// If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
		// and create a subscription.
		if (!subscription) {
			if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
				const channel = interaction.member.voice.channel;
				subscription = new MusicSubscription(
					joinVoiceChannel({
						channelId: channel.id,
						guildId: channel.guild.id,
						adapterCreator: channel.guild.voiceAdapterCreator,
						selfDeaf: true,
      					selfMute: false,
					}),
				);
				subscription.voiceConnection.on('error', console.warn);
				guild2subscriptions.set(interaction.guildId, subscription);
			}
		}
		
		if (!subscription) {
			// If there is no subscription, tell the user they need to join a channel.
			await interaction.followUp('Join a voice channel and then try that again!');
			return;
		}

		// Make sure the connection is ready before processing the user's request
		try {
			await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
		} catch (error) {
			console.warn(error);
			await interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
			interaction.deferred
			return;
		}

		try {
			// Attempt to enqueue a Track from URL.
			await Url2Enqueue.fromUrl(
				subscription,
				interaction,
				url,
				{
					onStart(title: string){interaction.followUp({ content: `再生中: **${title}**` }).catch(console.warn);},
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					onFinish(){},
					onError(error) {
						console.warn(error);
						interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn);
				},
			});
		} catch (error) {
			console.warn(error);
			await interaction.followUp(error);
		}
	} else if (interaction.commandName === 'skip') {
		if (subscription) {
			// Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
			// listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
			// will be loaded and played.
			subscription.audioPlayer.stop();
			await interaction.reply('スキップ');
		} else {
			await interaction.reply('何も再生してないよ？');
		}
	} else if (interaction.commandName === 'queue') {
		// Print out the current queue, including up to the next 5 tracks to be played.
		if (subscription) {
			const current =
				subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
					? `何も再生してないよ？`
					: `再生中: **${(subscription.audioPlayer.state.resource as AudioResource<Track>).metadata.title}**`;

			const queue = subscription.queue
				.slice(0, 5)
				.map((track, index) => `${index + 1}) ${track.title}`)
				.join('\n');

			await interaction.reply(`${current}\n\n${queue}`);
		} else {
			await interaction.reply({ content: '何も再生してないよ？', ephemeral: true });
		}
	} else if (interaction.commandName === 'pause') {
		if (subscription) {
			subscription.audioPlayer.pause();
			await interaction.reply({ content: `一時停止`, ephemeral: true });
		} else {
			await interaction.reply('何も再生してないよ？');
		}
	} else if (interaction.commandName === 'resume') {
		if (subscription) {
			subscription.audioPlayer.unpause();
			await interaction.reply({ content: `再生`, ephemeral: true });
		} else {
			await interaction.reply('何も再生してないよ？');
		}
	} else if (interaction.commandName === 'leave') {
		if (subscription) {
			subscription.voiceConnection.destroy();
			guild2subscriptions.delete(interaction.guildId);
			await interaction.reply({ content: `じゃあの`, ephemeral: true });
		} else {
			await interaction.reply('いねーよ');
		}
	} else if (interaction.commandName === 'ping') {
		await interaction.reply({ content: 'Pong!', ephemeral: true });
	} else {
		await interaction.reply('知らねーことをいうんじゃねえ。未実装だ');
	}
});

client.on('error', console.warn);

void client.login(config.token);