import { CacheType, CommandInteraction, MessageEmbed } from "discord.js";
import ytdl from "ytdl-core";
import ytpl from "ytpl";
import { MusicSubscription } from "./subscription";
import { Track } from "./track/track";
import { YtTrack } from "./track/ytTrack";

export class Url2Enqueue {
    // Enqueue the track and reply a success message to the user
    public static async fromUrl(subscription: MusicSubscription, interaction: CommandInteraction<CacheType>, url: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>): Promise<void> {
        const tracks: Track[] = [];
        const msgEmbed = new MessageEmbed();

        // detect URL
        if (ytpl.validateID(url)) {
            // youtube playlist
            console.log(url, "is Youtube playList.");
            const plId = await ytpl.getPlaylistID(url);
            const list = await ytpl(plId);

            msgEmbed.setTitle(`${list.items.length} items in playlist are enqueued`)
                .setDescription(`[${list.title}](${url})`)
                .setThumbnail(list.thumbnails[0]?.url ? list.thumbnails[0]?.url : 'Undefined')
                .setAuthor("Youtube Playlist")
                .setColor('#FF0000')
                
            list.items.forEach(item => {
                const track = new YtTrack({
                    url,
                    title: item.title,
                    thumbnailUrl: item.thumbnails[0]?.url ? item.thumbnails[0]?.url : 'Undefined',
                    ... YtTrack.wrapMethods(methods)
                })
                tracks.push(track);
            })
        } else if (ytdl.validateURL(url)) {
            // youtube (should not place this block before ytpl)
            console.log(url, "is Youtube.");
            const track = await YtTrack.from(url, methods);
            tracks.push(track);
            msgEmbed.setTitle(`Enqueued`)
                .setDescription(track.title)
                .setThumbnail(track.thumbnailUrl)
                .setAuthor("Youtube")
                .setColor('#FF0000')
                .setURL(url);
        } else {
            return new Promise((_, reject) => reject("Unknown Target URL"));
        }
        // enqueue
        for(const pt of tracks) {
            subscription.enqueue(pt);
        }
        // message reply
        await interaction.reply({
            embeds: [
                msgEmbed
            ]
        });
    }
}