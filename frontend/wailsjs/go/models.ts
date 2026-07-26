export namespace settings {
	
	export class Data {
	    preferredVideoQuality: number;
	    preferredAudioQuality: string;
	    preferredVideoCodec: string;
	    showMoreFormats: boolean;
	    downloadPath: string;
	    browser: string;
	    proxy: string;
	    configPath: string;
	    maxActiveDownloads: number;
	
	    static createFrom(source: any = {}) {
	        return new Data(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.preferredVideoQuality = source["preferredVideoQuality"];
	        this.preferredAudioQuality = source["preferredAudioQuality"];
	        this.preferredVideoCodec = source["preferredVideoCodec"];
	        this.showMoreFormats = source["showMoreFormats"];
	        this.downloadPath = source["downloadPath"];
	        this.browser = source["browser"];
	        this.proxy = source["proxy"];
	        this.configPath = source["configPath"];
	        this.maxActiveDownloads = source["maxActiveDownloads"];
	    }
	}

}

export namespace types {
	
	export class AudioFormat {
	    formatId: string;
	    ext: string;
	    sizeMb?: number;
	    label: string;
	
	    static createFrom(source: any = {}) {
	        return new AudioFormat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.formatId = source["formatId"];
	        this.ext = source["ext"];
	        this.sizeMb = source["sizeMb"];
	        this.label = source["label"];
	    }
	}
	export class DownloadRequest {
	    url: string;
	    mode: string;
	    videoFormatId?: string;
	    audioFormatId?: string;
	    extractFormat?: string;
	    extractQuality?: string;
	    outputDir: string;
	    title: string;
	    rangeStart?: string;
	    rangeEnd?: string;
	    writeSubs?: boolean;
	    videoExt?: string;
	    audioExt?: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.mode = source["mode"];
	        this.videoFormatId = source["videoFormatId"];
	        this.audioFormatId = source["audioFormatId"];
	        this.extractFormat = source["extractFormat"];
	        this.extractQuality = source["extractQuality"];
	        this.outputDir = source["outputDir"];
	        this.title = source["title"];
	        this.rangeStart = source["rangeStart"];
	        this.rangeEnd = source["rangeEnd"];
	        this.writeSubs = source["writeSubs"];
	        this.videoExt = source["videoExt"];
	        this.audioExt = source["audioExt"];
	    }
	}
	export class VideoFormat {
	    formatId: string;
	    ext: string;
	    height?: number;
	    fps?: number;
	    vcodec: string;
	    hasAudio: boolean;
	    sizeMb?: number;
	    label: string;
	
	    static createFrom(source: any = {}) {
	        return new VideoFormat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.formatId = source["formatId"];
	        this.ext = source["ext"];
	        this.height = source["height"];
	        this.fps = source["fps"];
	        this.vcodec = source["vcodec"];
	        this.hasAudio = source["hasAudio"];
	        this.sizeMb = source["sizeMb"];
	        this.label = source["label"];
	    }
	}
	export class MediaInfo {
	    id: string;
	    title: string;
	    thumbnail: string;
	    durationSec: number;
	    extractorKey: string;
	    videoFormats: VideoFormat[];
	    audioFormats: AudioFormat[];
	
	    static createFrom(source: any = {}) {
	        return new MediaInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.thumbnail = source["thumbnail"];
	        this.durationSec = source["durationSec"];
	        this.extractorKey = source["extractorKey"];
	        this.videoFormats = this.convertValues(source["videoFormats"], VideoFormat);
	        this.audioFormats = this.convertValues(source["audioFormats"], AudioFormat);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PlaylistDownloadEntry {
	    id: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new PlaylistDownloadEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	    }
	}
	export class PlaylistDownloadRequest {
	    playlistUrl: string;
	    entries: PlaylistDownloadEntry[];
	    mode: string;
	    extractFormat?: string;
	    extractQuality?: string;
	    outputDir: string;
	
	    static createFrom(source: any = {}) {
	        return new PlaylistDownloadRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.playlistUrl = source["playlistUrl"];
	        this.entries = this.convertValues(source["entries"], PlaylistDownloadEntry);
	        this.mode = source["mode"];
	        this.extractFormat = source["extractFormat"];
	        this.extractQuality = source["extractQuality"];
	        this.outputDir = source["outputDir"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PlaylistEntry {
	    id: string;
	    title: string;
	    url: string;
	    durationSec: number;
	    thumbnail: string;
	    index: number;
	
	    static createFrom(source: any = {}) {
	        return new PlaylistEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.url = source["url"];
	        this.durationSec = source["durationSec"];
	        this.thumbnail = source["thumbnail"];
	        this.index = source["index"];
	    }
	}
	export class PlaylistInfo {
	    title: string;
	    uploader: string;
	    entries: PlaylistEntry[];
	
	    static createFrom(source: any = {}) {
	        return new PlaylistInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.uploader = source["uploader"];
	        this.entries = this.convertValues(source["entries"], PlaylistEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SearchResult {
	    id: string;
	    title: string;
	    url: string;
	    durationSec: number;
	    thumbnail: string;
	    channel: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.url = source["url"];
	        this.durationSec = source["durationSec"];
	        this.thumbnail = source["thumbnail"];
	        this.channel = source["channel"];
	    }
	}

}

