import Assets from "./Assets";

/**
 * AUDIO OBJECT
 * TODO
 * extend this to have two separate channels
 * sfx channel
 * music channel
 * both connected to a master channel
 * to control all the relevant sfx & music
 * sounds independently
 */
export class Audio {
    private static _hasWebAudioSupport = !!window.AudioContext;
    private static _context: AudioContext;
    private static _master: GainNode;
    private static _music: GainNode;
    private static _sfx: GainNode;

    private static _getContext(): AudioContext {
        if (!Audio._context && Audio._hasWebAudioSupport) {
            Audio._context = new AudioContext();

            Audio._master = Audio._context.createGain();
            Audio._master.gain.value = 1;
            Audio._master.connect(Audio._context.destination);

            Audio._music = Audio._context.createGain();
            Audio._music.gain.value = 1;
            Audio._music.connect(Audio._master);

            Audio._sfx = Audio._context.createGain();
            Audio._sfx.gain.value = 1;
            Audio._sfx.connect(Audio._master);
        }
        return Audio._context;
    }

    public static get context(): AudioContext {
        return Audio._getContext();
    }

    public static get master(): GainNode {
        Audio._getContext();
        return Audio._master;
    }

    public static get music(): GainNode {
        Audio._getContext();
        return Audio._music;
    }

    public static get sfx(): GainNode {
        Audio._getContext();
        return Audio._sfx;
    }

    public static setVolume(
        channel: "sfx" | "music" | "master",
        value: number
    ) {
        const map = {
            sfx: Audio.sfx,
            music: Audio.music,
            master: Audio.master,
        };
        map[channel].gain.value = value;
    }
}

export type SoundConfig = {
    volume?: number;
    delay?: number;
    speed?: number;
    loop?: boolean;
    time?: number;
    filter?: BiquadFilterConfig;
    channel?: "sfx" | "music" | undefined;
};

type BiquadFilterConfig = {
    type: BiquadFilterType;
    frequency: number;
    gain: number;
    Q: number;
};

const SOUND_DEFAULTS = {
    volume: 1,
    delay: 0,
    speed: 1,
    loop: false,
    time: 0,
    filter: undefined,
    channel: "sfx",
} as SoundConfig;

export class Sound {
    private _buffer: AudioBuffer | null = null;
    private _sourceNode: AudioBufferSourceNode | null = null;
    private _filterNode: BiquadFilterNode | null = null;
    private _gainNode: GainNode | null = null;
    private _playing: boolean = false;
    private _options: SoundConfig;
    private _resolveReady!: () => void;

    private _startTime: number = 0; // Time at which playback started
    private _pauseOffset: number = 0; // Time into the sound when paused

    public ready: Promise<void>;

    constructor(url: string, config?: SoundConfig) {
        const options = {
            ...SOUND_DEFAULTS,
            ...config,
        };
        this._options = options;

        this.ready = new Promise<void>((resolve) => {
            this._resolveReady = resolve;
        });
        this._load(url);

        this._gainNode = Audio.context.createGain();
        this._gainNode.gain.value = options.volume ?? 1;

        const targetChannel =
            options.channel === "music" ? Audio.music : Audio.sfx;
        this._gainNode.connect(targetChannel);
    }

    private async _load(url: string) {
        this._buffer = await Assets.soundBuffer(url, Audio.context);
        this._resolveReady();
    }

    get playing() {
        return this._playing;
    }

    set volume(value: number) {
        if (this._gainNode) {
            this._gainNode.gain.value = value;
        }
    }

    public disconnect() {
        if (this._filterNode) {
            this._filterNode.disconnect();
            this._filterNode = null;
        }
        if (this._sourceNode) {
            this._sourceNode.disconnect();
        }
    }

    public play(overrides?: SoundConfig) {
        if (!this._buffer) {
            console.warn("Tried to play sound before it's loaded.");
            return;
        }

        if (this._playing) {
            this.stop();
        }

        const options = {
            ...this._options,
            ...overrides,
        };

        this._sourceNode = Audio.context.createBufferSource();
        this._sourceNode.buffer = this._buffer;
        this._sourceNode.loop = options.loop || false;
        this._sourceNode.playbackRate.value = options.speed || 1;
        this._sourceNode.onended = () => {
            this._sourceNode = null;
            this._playing = false;
        };

        if (!this._gainNode) {
            this._gainNode = Audio.context.createGain();
            const targetChannel =
                this._options.channel === "music" ? Audio.music : Audio.sfx;
            this._gainNode.connect(targetChannel);
        }
        this._gainNode.gain.value = options.volume || 1;

        if (options.filter) {
            this._filterNode = Audio.context.createBiquadFilter();
            this._filterNode.type = options.filter.type;
            this._filterNode.frequency.value = options.filter.frequency;
            this._filterNode.gain.value = options.filter.gain;
            this._filterNode.Q.value = options.filter.Q;
            this._sourceNode.connect(this._filterNode);
            this._filterNode.connect(this._gainNode);
        } else {
            this._sourceNode.connect(this._gainNode);
        }

        // this._sourceNode.start();
        this._startTime = Audio.context.currentTime;
        this._sourceNode.start(0, this._pauseOffset); // resume from offset (0 if fresh)
        this._pauseOffset = 0;
        this._playing = true;
    }

    public pause(): void {
        if (!this._sourceNode || !this._buffer) return;

        const elapsed = Audio.context.currentTime - this._startTime;
        this._pauseOffset += elapsed; // store how far we’ve gone
        this._sourceNode.stop();
        this._sourceNode.disconnect();
        this._sourceNode = null;
        this._playing = false;
    }

    public resume(): void {
        if (this._playing || !this._buffer) return;
        this.play(); // uses _pauseOffset automatically
    }

    public stop(): void {
        if (this._sourceNode) {
            this._sourceNode.stop();
            this._sourceNode.disconnect();
            this._sourceNode = null;
        }
        this._pauseOffset = 0;
        this._playing = false;
    }

    public fadeTo(volume: number, duration: number) {
        const now = Audio.context.currentTime;
        this._gainNode?.gain.setValueAtTime(this._gainNode.gain.value, now);
        this._gainNode?.gain.linearRampToValueAtTime(volume, now + duration);
    }

    public fadeIn(duration: number, to: number = 1) {
        const now = Audio.context.currentTime;
        this._gainNode?.gain.setValueAtTime(0, now);
        this._gainNode?.gain.linearRampToValueAtTime(to, now + duration);
    }

    public fadeOut(duration: number) {
        const now = Audio.context.currentTime;
        this._gainNode?.gain.setValueAtTime(this._gainNode.gain.value, now);
        this._gainNode?.gain.linearRampToValueAtTime(0, now + duration);
    }
}

// usage
// const gunshot = new Sound("sfx/gun.wav", { channel: "sfx" });
// const backgroundTrack = new Sound("music/loop.mp3", {
//     channel: "music",
//     loop: true,
// });

// await Promise.all([gunshot.ready, backgroundTrack.ready]);

// gunshot.play();
// backgroundTrack.play();

/**
 * example of an highpass filter
 * -----------------------------
 */
// function highpassFilter(context) {
//   // https://webaudio.github.io/web-audio-api/#enumdef-biquadfiltertype
//   const filter = context.createBiquadFilter();
//   filter.type = "highpass";
//   filter.frequency.value = 2660;
//   filter.Q.value = 25;
//   return filter;
// }
// const highpass = highpassFilter(Audio.context);

/**
 * example of an oscillator
 * ------------------------
 */
// const { context, master } = Audio;
// const bpm = 60 / 250;
// const note = 25;
// const playNote = (note, startTime, length) => {
//   const oscillator = context.createOscillator();
//   oscillator.type = "sawtooth";
//   oscillator.frequency.value = note;
//   oscillator.connect(master);
//   oscillator.start(startTime);
//   oscillator.stop(startTime + length);
// };
// playNote(note, 0, 1);

/**
 * example of fadeIn function
 * --------------------------
 */
// function fade(to, length) {
//   const now = context.currentTime;
//   master.gain.setValueAtTime(master.gain.value, now);
//   master.gain.linearRampToValueAtTime(to, now + length);
// }

// master.gain.value = 0;
// fade(1, 1);
