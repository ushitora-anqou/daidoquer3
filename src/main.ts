import { Client, ClientOptions, Interaction, GuildMember, Snowflake } from 'discord.js';
import config from './config/config.json';
import { MusicSubscription } from './music/subscription';
import {
  AudioPlayerStatus,
  AudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Track } from './music/track/track';
import { generateDependencyReport } from '@discordjs/voice';
import { Register } from './commands/register';
import { Url2Enqueue } from './music/url2enqueue';
import { usefulReplyOrFollowUp } from './discord/util';
import { coloredMsgEmbed } from './discord/msg';

console.log(generateDependencyReport());
const options: ClientOptions = {
  intents: ['GUILD_VOICE_STATES', 'GUILD_MESSAGES', 'GUILDS'],
};
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
          })
        );
        subscription.voiceConnection.on('error', console.warn);
        guild2subscriptions.set(interaction.guildId, subscription);
      }
    }

    if (!subscription) {
      // If there is no subscription, tell the user they need to join a channel.
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Join a voice channel first')],
      });
      return;
    }

    // Make sure the connection is ready before processing the user's request
    try {
      await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
    } catch (error) {
      console.warn(error);
      await usefulReplyOrFollowUp(interaction, {
        embeds: [
          coloredMsgEmbed('warn').setDescription(
            ':warning: Failed to join voice channel within 20 seconds, please try again later!'
          ),
        ],
      });
      return;
    }

    try {
      // Attempt to enqueue a Track from URL.
      await Url2Enqueue.fromUrl(subscription, interaction, url, {
        async onStart(title: string) {
          await interaction.channel?.send({
            embeds: [coloredMsgEmbed('info').setDescription(`:arrow_forward: ${title}`)],
          });
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onFinish() {},
        async onError(error) {
          console.warn(error);
          await interaction.channel?.send({
            embeds: [coloredMsgEmbed('error').setDescription(`:error: ${error.message}`)],
          });
        },
      });
    } catch (error) {
      console.warn('url2enqueue error:', error);
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('error').setTitle(':error:').setDescription(error)],
      });
    }
  } else if (interaction.commandName === 'skip') {
    if (subscription) {
      // Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
      // listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
      // will be loaded and played.
      subscription.audioPlayer.stop();
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('info').setDescription(`:fast_forward: Skipped`)],
      });
    } else {
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Not Playing')],
      });
    }
  } else if (interaction.commandName === 'queue') {
    // Print out the current queue, including up to the next 5 tracks to be played.
    if (subscription) {
      const msgEmbed = coloredMsgEmbed('info').setTitle('Queue');

      let current: string;
      if (subscription.audioPlayer.state.status === AudioPlayerStatus.Idle) {
        current = `Not Playing`;
      } else {
        const metadata = (subscription.audioPlayer.state.resource as AudioResource<Track>).metadata;
        current = `:arrow_forward: **[${metadata.title ?? 'Undefined'}](${metadata.url})**`;
        if (metadata.thumbnailUrl) {
          msgEmbed.setThumbnail(metadata.thumbnailUrl);
        }
      }

      const queue = subscription.queue
        .slice(0, 5)
        .map((track, index) => `${index + 1}) [${track.title ?? 'Undefined'}](${track.url})`)
        .join('\n');
      msgEmbed.setDescription(current + '\n' + queue);

      await usefulReplyOrFollowUp(interaction, { embeds: [msgEmbed] });
    } else {
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Not Playing')],
        ephemeral: true,
      });
    }
  } else if (interaction.commandName === 'pause') {
    if (subscription) {
      subscription.audioPlayer.pause();
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('info').setDescription(':pause_button:')],
        ephemeral: true,
      });
    } else {
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Not Playing')],
        ephemeral: true,
      });
    }
  } else if (interaction.commandName === 'resume') {
    if (subscription) {
      subscription.audioPlayer.unpause();
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('info').setDescription(':play_pause:')],
        ephemeral: true,
      });
    } else {
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Not Playing')],
        ephemeral: true,
      });
    }
  } else if (interaction.commandName === 'leave') {
    if (subscription) {
      subscription.voiceConnection.destroy();
      guild2subscriptions.delete(interaction.guildId);
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('info').setDescription(':wave:')],
        ephemeral: true,
      });
    } else {
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Not Playing')],
        ephemeral: true,
      });
    }
  } else if (interaction.commandName === 'ping') {
    await usefulReplyOrFollowUp(interaction, { content: 'Pong!', ephemeral: true });
  } else if (interaction.commandName === 'shuffle') {
    if (!subscription) {
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('warn').setDescription(':warning: Not Playing')],
        ephemeral: true,
      });
    } else {
      // FIXME: 雑なout-placeで先頭を考慮しないshuffleをやめろ
      const shuffle = (array: Track[]) => {
        const out = Array.from(array);
        for (let i = out.length - 1; i > 0; i--) {
          const r = Math.floor(Math.random() * (i + 1));
          const tmp = out[i] as Track;
          out[i] = out[r] as Track;
          out[r] = tmp;
        }
        return out;
      };
      subscription.queue = shuffle(subscription.queue);
      await usefulReplyOrFollowUp(interaction, {
        embeds: [coloredMsgEmbed('info').setDescription(':twisted_rightwards_arrows:')],
        ephemeral: true,
      });
    }
  } else {
    await usefulReplyOrFollowUp(interaction, '知らねーことをいうんじゃねえ。未実装だ');
  }
});

client.on('error', console.warn);

void client.login(config.token);
