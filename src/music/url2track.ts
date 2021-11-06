import ytdl from "ytdl-core";
import { Track } from "./track/track";
import { Yt2Track } from "./track/yt2track";

export class Url2Track {
    public static async fromUrl(url: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>): Promise<Track> {
        if (ytdl.validateURL(url)) {
            // Youtube
            return await Yt2Track.from(url, methods);
        } else {
            return await new Promise((_, reject) => reject("Unknown Target URL"))
        }
    }
}