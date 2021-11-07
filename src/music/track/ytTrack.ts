import ytdl from 'ytdl-core';
import { Track, TrackData } from './track';
import { Readable } from 'stream';

/**
 * Track implements for Youtube.
 */
export class YtTrack extends Track {
  constructor({ url, title, thumbnailUrl, onStart, onFinish, onError }: TrackData) {
    super({ url, title, thumbnailUrl, onStart, onFinish, onError });
  }

  public createStream(): Readable {
    return ytdl(ytdl.getURLVideoID(this.url), {
      filter: (format) => format.audioCodec === 'opus' && format.container === 'webm',
      quality: 'highest',
      highWaterMark: 32 * 1024 * 1024,
    });
  }

  public static async from(url: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>): Promise<YtTrack> {
    let title: string | undefined;
    let thumbnailUrl: string | undefined;
    await ytdl.getInfo(url).then((info) => {
      title = info.videoDetails.title;
      thumbnailUrl = info.videoDetails.thumbnails[0]?.url;
    });
    return new YtTrack({
      url,
      title: title,
      thumbnailUrl: thumbnailUrl,
      ...this.wrapMethods(methods),
    });
  }
}
