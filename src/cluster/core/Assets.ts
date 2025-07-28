/**
 * File: src/cluster/core/Assets.ts
 *
 * Asset management module for cluster-engine-2.
 *
 * This file provides a centralized asset loader and cache for images, audio, fonts, and JSON data.
 * It manages asynchronous loading, tracks loading progress, and exposes ready/progress listeners.
 * Supported asset types include images (HTMLImageElement), audio (HTMLAudioElement/Sound/SoundBuffer),
 * web fonts, and arbitrary JSON resources. All assets are cached to prevent redundant network requests.
 */

import { Sound, SoundConfig } from "./Sound";

/**
 * Callback type for progress updates.
 * @param remaining - The number of assets remaining to load.
 * @param total - The total number of assets to load.
 */
type ProgressCallback = (remaining: number, total: number) => void;

/**
 * Callback type for ready state.
 */
type Callback = () => void;

/**
 * AssetMaker type for creating/loading assets.
 * @param url - The asset URL.
 * @param onAssetLoad - Handler called when the asset is loaded.
 */
type AssetMaker = (
    url: string,
    onAssetLoad: (e: Event | string) => void
) => any;

/** Cache for loaded assets, keyed by URL. */
let cache: { [key: string]: any } = {};
/** Listeners to be invoked when all assets are ready. */
let readyListeners: Callback[] = [];
/** Listeners to be invoked on asset loading progress. */
let progressListeners: ProgressCallback[] = [];

let completed = false;
let remaining = 0;
let total = 0;

/**
 * Internal: Called when all assets are loaded.
 */
function done(): void {
    completed = true;
    readyListeners.forEach((cb) => cb());
}

/**
 * Internal: Called when an asset finishes loading.
 * @param e - Load event or asset identifier.
 */
function onAssetLoad(e: Event | string): void {
    if (completed) {
        console.warn("Warning: asset defined after preload.", e);
        return;
    }

    remaining--;
    progressListeners.forEach((cb) => cb(total - remaining, total));
    if (remaining === 0) {
        done();
    }
}

/**
 * Internal: Loads an asset using the specified maker function.
 * Handles caching, progress tracking and asset registration.
 * @param url - Asset URL.
 * @param maker - Asset creation/loading function.
 * @returns The loaded asset.
 */
function load(url: string, maker: AssetMaker): any {
    let cacheKey = url;
    while (cacheKey.startsWith("../")) {
        cacheKey = url.slice(3);
    }
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }
    const asset = maker(url, onAssetLoad);
    remaining++;
    total++;

    cache[cacheKey] = asset;
    return asset;
}

/**
 * Asset management and loading utility.
 * Handles preloading, progress tracking, caching, and type-specific asset loading.
 */
export const Assets = {
    /**
     * Returns true if all assets have finished loading.
     */
    get completed() {
        return completed;
    },

    /**
     * Registers a callback to be called when all assets are loaded.
     * If already completed, invokes the callback immediately.
     * @param cb - Callback to invoke when ready.
     */
    onReady(cb: Callback): void | Callback {
        if (completed) {
            return cb();
        }

        readyListeners.push(cb);
        if (remaining === 0) {
            done();
        }
    },

    /**
     * Registers a callback to be called on asset loading progress.
     * @param cb - Callback to invoke with progress updates.
     */
    onProgress(cb: ProgressCallback): void {
        progressListeners.push(cb);
    },

    /**
     * Loads an image asset from the specified URL.
     * @param url - The image URL.
     * @returns The HTMLImageElement.
     * @throws If URL is not provided.
     */
    image(url: string): HTMLImageElement {
        if (!url) throw new Error("[Assets.ts:image] URL is required!");
        return load(url, (url, onAssetLoad) => {
            const img = new Image();
            img.src = url;
            img.addEventListener("load", onAssetLoad, false);
            return img;
        });
    },

    /**
     * Loads an audio asset from the specified URL.
     * @param url - The audio file URL.
     * @returns The HTMLAudioElement.
     */
    sound(url: string): HTMLAudioElement {
        return load(url, (url, onAssetLoad) => {
            const audio = new Audio();
            audio.src = url;
            const onLoad = (e: Event) => {
                audio.removeEventListener("canplay", onLoad);
                onAssetLoad(e);
            };
            audio.addEventListener("canplay", onLoad, false);
            return audio.cloneNode() as HTMLAudioElement;
        });
    },

    /**
     * Loads and decodes an audio buffer from the specified URL.
     * @param url - The audio file URL.
     * @param ctx - The AudioContext to use for decoding.
     * @returns A promise resolving to the decoded AudioBuffer.
     * @throws If no AudioContext is provided.
     */
    soundBuffer(
        url: string,
        ctx: AudioContext | null = null
    ): Promise<AudioBuffer> {
        if (!ctx) return Promise.reject("[Assets]: No AudioContext detected");
        return load(url, (url, onAssetLoad) =>
            fetch(url)
                .then((r) => r.arrayBuffer())
                .then(
                    (ab) =>
                        new Promise((success) => {
                            ctx.decodeAudioData(ab, (buffer) => {
                                onAssetLoad(url);
                                success(buffer);
                            });
                        })
                )
        );
    },

    /**
     * Loads a Sound object, using the internal asset system for progress and caching.
     * @param url - The audio file URL.
     * @param config - Optional configuration for the Sound object.
     * @returns The Sound instance.
     */
    soundObject(url: string, config?: SoundConfig): Sound {
        const sound = new Sound(url, config);

        // Register in asset system and hook into its tracking
        load(url, (url, onAssetLoad) => {
            sound.ready.then(() => onAssetLoad(url));
            return sound;
        });

        return sound;
    },

    /**
     * Loads a web font using the FontFace API.
     * @param name - Font family name.
     * @param url - Font file URL.
     * @returns A promise resolving when the font is loaded.
     */
    font(name: string, url: string): Promise<void> {
        return load(url, (url, onAssetLoad) => {
            const fontFace = new FontFace(name, `url(${url})`);
            (document.fonts as any).add(fontFace);
            return fontFace.load().then(() => {
                onAssetLoad(url);
            });
        });
    },

    /**
     * Loads and parses a JSON asset from the specified URL.
     * @param url - The JSON file URL.
     * @returns A promise resolving to the loaded JSON data.
     */
    json(url: string): Promise<any> {
        return load(url, (url, onAssetLoad) =>
            fetch(url)
                .then((res) => res.json())
                .then((json) => {
                    onAssetLoad(url);
                    return json;
                })
        );
    },
};

export default Assets;
