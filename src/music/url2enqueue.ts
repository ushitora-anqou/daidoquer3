import { CacheType, CommandInteraction, EmbedBuilder } from 'discord.js';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import { MusicSubscription } from './subscription';
import { Track } from './track/track';
import { YtTrack } from './track/ytTrack';
import { URL } from 'node:url';
import { ScTrack } from './track/scTrack';
import { usefulReplyOrFollowUp } from '../discord/util';
import { NicoTrack } from './track/nicoTrack';

export class Url2Enqueue {
  // Enqueue the track and reply a success message to the user
  public static async fromUrl(
    subscription: MusicSubscription,
    interaction: CommandInteraction<CacheType>,
    url: string,
    methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>
  ): Promise<void> {
    const tracks: Track[] = [];
    const msgEmbed = new EmbedBuilder();
    let representiveTrack: Pick<Track, 'title' | 'thumbnailUrl'> | undefined;

    // detect URL
    if (ytpl.validateID(url)) {
      // youtube playlist
      console.log(url, 'is Youtube playList.');
      const plId = await ytpl.getPlaylistID(url);
      const list = await ytpl(plId);
      representiveTrack = { title: list.title, thumbnailUrl: list.bestThumbnail.url ?? undefined };

      msgEmbed
        .setTitle(`${list.items.length} items in playlist are enqueued`)
        .setAuthor({name:'Youtube Playlist', iconURL: 'https://www.youtube.com/yts/img/favicon_96-vflW9Ec0w.png'})
        .setColor('#FF0000');

      list.items.forEach((item) => {
        const track = new YtTrack({
          url: item.url,
          title: item.title,
          thumbnailUrl: item.thumbnails[0]?.url ?? undefined,
          ...YtTrack.wrapMethods(methods),
        });
        tracks.push(track);
      });
    } else if (ytdl.validateURL(url)) {
      // youtube (should not place this block before ytpl)
      console.log(url, 'is Youtube.');
      const track = await YtTrack.from(url, methods);
      representiveTrack = { title: track.title, thumbnailUrl: track.thumbnailUrl };
      tracks.push(track);
      msgEmbed
        .setTitle(`Enqueued`)
        .setAuthor({name: 'Youtube', iconURL: 'https://www.youtube.com/yts/img/favicon_96-vflW9Ec0w.png'})
        .setColor('#FF0000');
    } else {
      // URL validate
      try {
        const validatedUrl = new URL(url);
        if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
          throw TypeError('Invalid URL');
        }
        if (validatedUrl.hostname === 'soundcloud.com') {
          console.log(url, 'is Soundcloud.');
          // soundcloud is too heavy so deferred reply.
          await interaction.deferReply();
          const track = await ScTrack.from(url, methods);
          representiveTrack = { title: track.title, thumbnailUrl: track.thumbnailUrl };
          tracks.push(track);
          msgEmbed
            .setTitle(`Enqueued`)
            .setAuthor({
              name: 'SoundCloud',
              iconURL: 'https://developers.soundcloud.com/assets/logo_big_white-65c2b096da68dd533db18b9f07d14054.png'
            })
            .setColor('#FE5000');
        } else if (validatedUrl.hostname === 'www.nicovideo.jp') {
          console.log(url, 'is NicoVideo.');
          const track = await NicoTrack.from(url, methods);
          representiveTrack = { title: track.title, thumbnailUrl: track.thumbnailUrl };
          tracks.push(track);
          msgEmbed
            .setTitle(`Enqueued`)
            .setAuthor({name: 'Niconico', iconURL: 'https://nicovideo.cdn.nimg.jp/web/images/favicon/48.png'})
            .setColor('#252525');
        } else {
          throw Error('Unknown URL');
        }
      } catch (e) {
        return new Promise((_, reject) => reject(e));
      }
    }
    // enqueue
    for (const pt of tracks) {
      subscription.enqueue(pt);
      console.log('enqueued');
    }
    // message reply
    if (representiveTrack) {
      if (representiveTrack.title) msgEmbed.setDescription(`[${representiveTrack.title}](${url})`);
      if (representiveTrack.thumbnailUrl) msgEmbed.setThumbnail(representiveTrack.thumbnailUrl);
    }
    await usefulReplyOrFollowUp(interaction, {
      embeds: [msgEmbed],
      ephemeral: false,
    });
  }
}
