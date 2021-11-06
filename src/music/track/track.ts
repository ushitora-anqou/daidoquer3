import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import { Readable } from 'stream';

/**
 * This is the data required to create a Track object.
 */
export interface TrackData {
	url: string;
	onStart: (title: string) => void;
	onFinish: () => void;
	onError: (error: Error) => void;
	title: string;
	thumbnailUrl: string;
}

/**
 * A Track represents information about a YouTube video (in this context) that can be added to a queue.
 * It contains the title and URL of the video, as well as functions onStart, onFinish, onError, that act
 * as callbacks that are triggered at certain points during the track's lifecycle.
 *
 * Rather than creating an AudioResource for each video immediately and then keeping those in a queue,
 * we use tracks as they don't pre-emptively load the videos. Instead, once a Track is taken from the
 * queue, it is converted into an AudioResource just in time for playback.
 */
export abstract class Track implements TrackData {
	public readonly url: string;
	public readonly onStart: (title: string) => void;
	public readonly onFinish: () => void;
	public readonly onError: (error: Error) => void;
	public readonly title: string;
	public readonly thumbnailUrl: string;

	constructor({ url, title, thumbnailUrl, onStart, onFinish, onError }: TrackData) {
		this.url = url;
		this.title = title;
		this.thumbnailUrl = thumbnailUrl
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
	}

	/**
	 * Creates an AudioResource from this Track.
	 */
	public createAudioResource(): Promise<AudioResource<Track>> {
		return new Promise((resolve, reject) => {
			const stream = this.createStream();
			demuxProbe(stream)
				.then((probe) => resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type })))
				.catch(error => reject(error));
		});
	};

	/**
	 * Helper creating wrapped methods to guarantee calling methods at least once
	 * @param methods target raw methods, {'onStart', 'onFinish', 'onError'}
	 * @returns wrapped methods with noop 
	 */
	public static wrapMethods(methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>) : Pick<Track, 'onStart' | 'onFinish' | 'onError'>{
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const noop = () => {};
		const wrappedMethods = {
			onStart(title: string) {
				wrappedMethods.onStart = noop;
				methods.onStart(title);
			},
			onFinish() {
				wrappedMethods.onFinish = noop;
				methods.onFinish();
			},
			onError(error: Error) {
				wrappedMethods.onError = noop;
				methods.onError(error);
			},
		};
		return wrappedMethods;
	}

	/**
	 * Needs implements
	 * createStream
	 * create stream: Readable from this.url and so on.
	 */
	public abstract createStream(): Readable; 

	/**
	 * Needs implements
	 * from
	 * create target class extended Track from url and methods.
	 * @param url 
	 * @param methods 
	 * @returns 
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public static async from(url: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>): Promise<Track>{
		return new Promise((_, reject) => reject('Not Implemented target URL.'));
	};
}