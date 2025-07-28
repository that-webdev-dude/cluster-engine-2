import Assets from "./Assets";

/**
 * File: src/cluster/core/Sound.ts
 *
 * Web Audio-based sound and music playback for cluster-engine-2.
 *
 * Provides a flexible audio interface supporting separate SFX and music channels,
 * both routed through a master gain for unified volume control. Supports loading,
 * playback, pausing, resuming, volume fades, filters, and multiple sound instances.
 *
 * Features:
 * - Master, SFX, and Music gain nodes for independent volume control
 * - Promise-based loading of audio buffers via Assets manager
 * - Playback, pause, resume, stop, and one-shot sound control
 * - Volume fades and biquad filter support per-sound
 * - Deferred (awaitable) sound readiness and channel assignment
 * - Extensible for future multi-channel/track mixing
 *
 * TODO:
 * - Extend to allow more than two channels and more advanced mixing/routing.
 * - Additional utilities for oscillator/FX (see commented examples).
 */

/**
 * AUDIO OBJECT
 * TODO:
 * Extend this to have two separate channels:
 *   - SFX channel
 *   - Music channel
 * Both connected to a master channel to control all the relevant SFX & music
 * sounds independently.
 */
export class Audio {
    private static _hasWebAudioSupport = !!window.AudioContext;
    private static _context: AudioContext;
    private static _master: GainNode;
    private static _music: GainNode;
    private static _sfx: GainNode;

    /**
     * Internal: Initializes and returns the shared AudioContext and gain nodes.
     */
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

    /** Returns the shared AudioContext. */
    public static get context(): AudioContext {
        return Audio._getContext();
    }

    /** Returns the master gain node (controls all output). */
    public static get master(): GainNode {
        Audio._getContext();
        return Audio._master;
    }

    /** Returns the music channel gain node. */
    public static get music(): GainNode {
        Audio._getContext();
        return Audio._music;
    }

    /** Returns the SFX channel gain node. */
    public static get sfx(): GainNode {
        Audio._getContext();
        return Audio._sfx;
    }

    /**
     * Sets the volume for a specific channel ("master", "music", or "sfx").
     * @param channel - Channel name
     * @param value - Gain (0..1)
     */
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

/**
 * Configuration object for sound playback and effects.
 */
export type SoundConfig = {
    /** Output volume (0..1) */
    volume?: number;
    /** Delay before playback (seconds) */
    delay?: number;
    /** Playback speed (1 = normal) */
    speed?: number;
    /** Loop sound? */
    loop?: boolean;
    /** Start time offset (seconds) */
    time?: number;
    /** Optional biquad filter configuration */
    filter?: BiquadFilterConfig;
    /** Channel: "sfx" or "music" */
    channel?: "sfx" | "music" | undefined;
};

type BiquadFilterConfig = {
    type: BiquadFilterType;
    frequency: number;
    gain: number;
    Q: number;
};

const SOUND_DEFAULTS: SoundConfig = {
    volume: 1,
    delay: 0,
    speed: 1,
    loop: false,
    time: 0,
    filter: undefined,
    channel: "sfx",
};

/**
 * Sound object for loading, playing, pausing, resuming, and stopping audio.
 * Supports per-sound volume, loop, speed, filters, channel assignment, and
 * seamless integration with the master/music/sfx architecture.
 */
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

    /** Promise resolves when audio buffer is loaded and ready to play. */
    public ready: Promise<void>;

    /**
     * Creates a sound object and begins loading the audio buffer.
     * @param url - Path to the audio file
     * @param config - Sound configuration (optional)
     */
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

    /**
     * Loads the sound file and decodes to AudioBuffer.
     * @param url - Path to audio file
     */
    private async _load(url: string) {
        this._buffer = await Assets.soundBuffer(url, Audio.context);
        this._resolveReady();
    }

    /** True if currently playing. */
    get playing() {
        return this._playing;
    }

    /** Sets the output volume (0..1) for this sound. */
    set volume(value: number) {
        if (this._gainNode) {
            this._gainNode.gain.value = value;
        }
    }

    /** Disconnects filter/source nodes from the audio graph. */
    public disconnect() {
        if (this._filterNode) {
            this._filterNode.disconnect();
            this._filterNode = null;
        }
        if (this._sourceNode) {
            this._sourceNode.disconnect();
        }
    }

    /**
     * Plays the sound, or restarts if already playing.
     * Applies configuration overrides if provided.
     * @param overrides - Optional runtime overrides for playback
     */
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

        this._startTime = Audio.context.currentTime;
        this._sourceNode.start(0, this._pauseOffset); // resume from offset (0 if fresh)
        this._pauseOffset = 0;
        this._playing = true;
    }

    /**
     * Pauses playback, saving the current offset for later resumption.
     */
    public pause(): void {
        if (!this._sourceNode || !this._buffer) return;

        const elapsed = Audio.context.currentTime - this._startTime;
        this._pauseOffset += elapsed; // store how far we’ve gone
        this._sourceNode.stop();
        this._sourceNode.disconnect();
        this._sourceNode = null;
        this._playing = false;
    }

    /**
     * Resumes playback from last pause offset.
     */
    public resume(): void {
        if (this._playing || !this._buffer) return;
        this.play(); // uses _pauseOffset automatically
    }

    /**
     * Stops playback and resets pause offset.
     */
    public stop(): void {
        if (this._sourceNode) {
            this._sourceNode.stop();
            this._sourceNode.disconnect();
            this._sourceNode = null;
        }
        this._pauseOffset = 0;
        this._playing = false;
    }

    /**
     * Smoothly fades the sound volume to a target value over duration (seconds).
     * @param volume - Target volume (0..1)
     * @param duration - Duration in seconds
     */
    public fadeTo(volume: number, duration: number) {
        const now = Audio.context.currentTime;
        this._gainNode?.gain.setValueAtTime(this._gainNode.gain.value, now);
        this._gainNode?.gain.linearRampToValueAtTime(volume, now + duration);
    }

    /**
     * Fades in from silence to the target volume over specified duration.
     * @param duration - Fade in duration in seconds
     * @param to - Final volume (default 1)
     */
    public fadeIn(duration: number, to: number = 1) {
        const now = Audio.context.currentTime;
        this._gainNode?.gain.setValueAtTime(0, now);
        this._gainNode?.gain.linearRampToValueAtTime(to, now + duration);
    }

    /**
     * Fades out to silence over specified duration, then stops playback.
     * @param duration - Fade out duration in seconds
     */
    public fadeOut(duration: number) {
        const now = Audio.context.currentTime;
        this._gainNode?.gain.setValueAtTime(this._gainNode.gain.value, now);
        this._gainNode?.gain.linearRampToValueAtTime(0, now + duration);
    }
}

/*
 * USAGE EXAMPLES:
 *
 * // One-shot SFX and looping background music
 * const gunshot = new Sound("sfx/gun.wav", { channel: "sfx" });
 * const backgroundTrack = new Sound("music/loop.mp3", {
 *     channel: "music",
 *     loop: true,
 * });
 * await Promise.all([gunshot.ready, backgroundTrack.ready]);
 * gunshot.play();
 * backgroundTrack.play();
 *
 * // Example: highpass filter
 * function highpassFilter(context) {
 *   const filter = context.createBiquadFilter();
 *   filter.type = "highpass";
 *   filter.frequency.value = 2660;
 *   filter.Q.value = 25;
 *   return filter;
 * }
 * const highpass = highpassFilter(Audio.context);
 *
 * // Example: oscillator
 * const { context, master } = Audio;
 * const playNote = (note, startTime, length) => {
 *   const oscillator = context.createOscillator();
 *   oscillator.type = "sawtooth";
 *   oscillator.frequency.value = note;
 *   oscillator.connect(master);
 *   oscillator.start(startTime);
 *   oscillator.stop(startTime + length);
 * };
 * playNote(25, 0, 1);
 *
 * // Example: fade in
 * function fade(to, length) {
 *   const now = context.currentTime;
 *   master.gain.setValueAtTime(master.gain.value, now);
 *   master.gain.linearRampToValueAtTime(to, now + length);
 * }
 * master.gain.value = 0;
 * fade(1, 1);
 */
