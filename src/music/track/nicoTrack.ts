import { Track, TrackData } from './track';
import { Readable, PassThrough } from 'stream';
import { getThumbInfo } from 'niconico-thumbinfo';
import { URL } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const ffmpeg = require('ffmpeg-static');
import * as cp from 'child_process';

/**
 * Track implements for Niconico.
 */
export class NicoTrack extends Track {
  constructor({ url, title, thumbnailUrl, onStart, onFinish, onError, onRetry }: TrackData) {
    super({ url, title, thumbnailUrl, onStart, onFinish, onError, onRetry });
  }

  public static url2VideoId(url: string): string {
    const validatedUrl = new URL(url);
    return validatedUrl.pathname.replace('/watch/', '');
  }

  public async createStream(): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const audio: PassThrough = new PassThrough();
        const ytdlpProcess = cp.spawn(
          `./vendor/yt-dlp/yt-dlp`,
          ['--no-check-certificate', '-o', '-', '-q', `${this.url}`],
          {
            windowsHide: true,
            stdio: [
              /* Standard: stdin, stdout, stderr */
              'inherit',
              'pipe',
              'inherit',
            ],
          }
        );
        // FIXME: try to prism
        const ffmpegProcess = cp.spawn(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ffmpeg,
          [
            // Remove ffmpeg's console spamming
            '-loglevel',
            '8',
            '-hide_banner',
            // set input
            '-i',
            'pipe:0',
            // video no
            '-vn',
            // codec
            '-acodec',
            'libopus',
            // muxer
            // FIXME: setting webm says
            /**
             * Did not find the EBML tag at the start of the stream
             *  at WebmDemuxer._readTag (.../daidoquer3/node_modules/prism-media/src/core/WebmBase.js:113:18)
             *  at WebmDemuxer._transform (.../daidoquer3/node_modules/prism-media/src/core/WebmBase.js:47:23)
             */
            // idk why.
            '-f',
            'ogg',
            // Define output to pipe
            'pipe:1',
          ],
          {
            windowsHide: true,
            stdio: [
              /* Standard: stdin, stdout, stderr */
              'pipe',
              'pipe',
              'inherit',
            ],
          }
        );
        // ytdlp Link streams
        ytdlpProcess.stdio[1].on('data', (chunk) => {
          ffmpegProcess.stdin.write(chunk);
        });
        ytdlpProcess.on('error', (e) => {
          ffmpegProcess.stdin.end();
          reject(e);
        });
        ytdlpProcess.on('close', () => {
          ffmpegProcess.stdin.end();
        });
        // ffmpeg Link streams
        ffmpegProcess.stdio[1].on('data', (chunk) => {
          console.log('audio...')
          audio.write(chunk);
        });
        ffmpegProcess.on('error', (e) => {
          audio.end();
          reject(e);
        });
        ffmpegProcess.on('close', (code, signal) => {
          if (code !== 0) {
            console.warn(code, signal);
            reject('ffmpeg Error');
          } else {
            resolve(audio);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  public static async from(url: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError' | 'onRetry'>): Promise<NicoTrack> {
    let title: string | undefined;
    let thumbnailUrl: string | undefined;
    await getThumbInfo(NicoTrack.url2VideoId(url)).then((info) => {
      (title = info.avalable ? info.title : undefined), (thumbnailUrl = info.avalable ? info.thumbnailUrl : undefined);
    });
    return new NicoTrack({
      url,
      title: title,
      thumbnailUrl: thumbnailUrl,
      ...this.wrapMethods(methods),
    });
  }
}
