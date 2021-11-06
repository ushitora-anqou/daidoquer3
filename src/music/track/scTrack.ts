import { Track, TrackData } from "./track";
import { Readable } from "stream";
import Soundcloud from "soundcloud.ts";

export class ScTrack extends Track {
    static client = new Soundcloud("");

    constructor({ url, title, thumbnailUrl, onStart, onFinish, onError }: TrackData) {
		super({url, title, thumbnailUrl, onStart, onFinish, onError});
	}

	public async createStream(): Promise<Readable> {
        return new Readable().wrap(await ScTrack.client.util.streamTrack(this.url));
	};

	public static async from(url: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>): Promise<ScTrack>{
		let title: string | undefined;
		let thumbnailUrl: string | undefined;	
		await ScTrack.client.tracks.getV2(url)
            .then(info => {
                title = info.title;
                thumbnailUrl = info.artwork_url;
            });
        console.log(thumbnailUrl);
		return new ScTrack({
			url,
			title: title ? title : 'Undefined title',
			thumbnailUrl: thumbnailUrl ? thumbnailUrl : 'Undefined',
			... this.wrapMethods(methods)
		})
	}
}