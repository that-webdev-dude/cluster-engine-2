import { View, CommandBuffer, ECSUpdateSystem } from "../../../cluster";
import {
    Component,
    DESCRIPTORS,
    AnimationIndex,
    SpriteIndex,
} from "../components";
import { spritesheet } from "../assets";

/**
 * PLAYING field is treated as FLAGS (bitmask) to stay backward compatible:
 * - BIT_PLAYING   = 1 << 0  // 1  (legacy "playing" == 1 still works)
 * - BIT_LOOP      = 1 << 1  // 2  (loop from END -> START)
 * - BIT_PINGPONG  = 1 << 2  // 4  (bounce between START and END)
 * - BIT_ONCE      = 1 << 3  // 8  (play to END and stop on last frame)
 * - BIT_DIRECTION = 1 << 4  // 16 (0 = forward, 1 = reverse) — used by ping‑pong or manual reverse
 *
 * Notes:
 *  - If no mode bits are set (only BIT_PLAYING), default is forward loop if START<=END.
 *  - For strict backward compat: set FLAGS=1 for simple looping forward.
 */
const BIT_PLAYING = 1 << 0;
const BIT_LOOP = 1 << 1;
const BIT_PINGPONG = 1 << 2;
const BIT_ONCE = 1 << 3;
const BIT_DIRECTION = 1 << 4;

const EPS = 1e-8;
const MIN_FRAME_TIME = 1e-4; // ~0.1 ms; protects against TIME<=0

export class AnimationSystem extends ECSUpdateSystem {
    // temp scratch for potential out‑param APIs (if your spritesheet supports it)
    private readonly rect4 = new Int32Array(4);

    update(view: View, _cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.Sprite, Component.Animation],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                const sprite = chunk.views.Sprite;
                const animation = chunk.views.Animation;

                const animStride = DESCRIPTORS.Animation.count;
                const sprStride = DESCRIPTORS.Sprite.count;

                // Process each entity in the chunk
                for (let i = 0; i < count; i++) {
                    const animBase = i * animStride;
                    const sprBase = i * sprStride;

                    // Load hot fields into locals (fewer typed‑array accesses)
                    let start = animation[animBase + AnimationIndex.START] | 0;
                    let end = animation[animBase + AnimationIndex.END] | 0;
                    let current =
                        animation[animBase + AnimationIndex.CURRENT] | 0;

                    // TIME is per‑frame duration (seconds)
                    let frameTime = animation[animBase + AnimationIndex.TIME];
                    // Clamp TIME
                    if (frameTime <= MIN_FRAME_TIME) frameTime = MIN_FRAME_TIME;

                    // Accumulate elapsed safely (and keep precision)
                    let elapsed =
                        animation[animBase + AnimationIndex.ELAPSED] + dt;

                    // Flags (legacy: 0 == paused, 1 == playing)
                    let flags =
                        animation[animBase + AnimationIndex.PLAYING] | 0;

                    // Normalise invalid ranges
                    if (start > end) {
                        const t = start;
                        start = end;
                        end = t;
                    }

                    // If paused, don't rewrite rects or mutate current/elapsed
                    if ((flags & BIT_PLAYING) === 0) {
                        // Snap to START only if CURRENT is out of range (data hygiene)
                        if (current < start || current > end) {
                            current = start;
                            this.writeSpriteRectFromFrame(
                                sprite,
                                sprBase,
                                current
                            );
                            animation[animBase + AnimationIndex.CURRENT] =
                                current;
                        }
                        // Keep accumulated elapsed stable (no jitter)
                        animation[animBase + AnimationIndex.ELAPSED] = Math.min(
                            elapsed,
                            frameTime - EPS
                        );
                        continue;
                    }

                    // Decide direction: 0=forward, 1=reverse
                    let reverse = (flags & BIT_DIRECTION) !== 0;

                    // Advance frames; catch up if dt spans multiple frames.
                    let advanced = 0;
                    while (elapsed + EPS >= frameTime) {
                        elapsed -= frameTime;
                        advanced++;

                        if ((flags & BIT_PINGPONG) !== 0) {
                            // Ping‑pong: move within [start,end], flipping direction at ends.
                            if (!reverse) {
                                if (current < end) {
                                    current++;
                                } else {
                                    // flip to reverse and step one
                                    reverse = true;
                                    flags |= BIT_DIRECTION;
                                    if (current > start) current--;
                                }
                            } else {
                                if (current > start) {
                                    current--;
                                } else {
                                    // flip to forward and step one
                                    reverse = false;
                                    flags &= ~BIT_DIRECTION;
                                    if (current < end) current++;
                                }
                            }
                        } else if ((flags & BIT_ONCE) !== 0) {
                            // Play once (clamp at end and pause)
                            if (!reverse) {
                                if (current < end) current++;
                                if (current >= end) {
                                    current = end;
                                    // stop playing
                                    flags &= ~BIT_PLAYING;
                                    elapsed = 0;
                                    break;
                                }
                            } else {
                                if (current > start) current--;
                                if (current <= start) {
                                    current = start;
                                    flags &= ~BIT_PLAYING;
                                    elapsed = 0;
                                    break;
                                }
                            }
                        } else {
                            // Looping (default if BIT_LOOP set; also legacy behavior)
                            if (!reverse) {
                                current++;
                                if (current > end) {
                                    if (
                                        (flags & BIT_LOOP) !== 0 ||
                                        (flags &
                                            (BIT_LOOP |
                                                BIT_PINGPONG |
                                                BIT_ONCE)) ===
                                            0
                                    ) {
                                        current = start; // loop
                                    } else {
                                        current = end; // if loop not set and no other mode, clamp
                                    }
                                }
                            } else {
                                current--;
                                if (current < start) {
                                    if (
                                        (flags & BIT_LOOP) !== 0 ||
                                        (flags &
                                            (BIT_LOOP |
                                                BIT_PINGPONG |
                                                BIT_ONCE)) ===
                                            0
                                    ) {
                                        current = end; // loop reverse
                                    } else {
                                        current = start;
                                    }
                                }
                            }
                        }
                    }

                    // Write back animation state
                    animation[animBase + AnimationIndex.ELAPSED] = elapsed;
                    animation[animBase + AnimationIndex.CURRENT] = current;
                    animation[animBase + AnimationIndex.PLAYING] = flags;

                    // Update sprite rect only if we actually changed frame
                    if (advanced > 0) {
                        this.writeSpriteRectFromFrame(sprite, sprBase, current);
                    } else {
                        // If CURRENT is out of range due to external writes, correct it.
                        if (current < start || current > end) {
                            const clamped = Math.min(
                                Math.max(current, start),
                                end
                            );
                            if (clamped !== current) {
                                current = clamped;
                                animation[animBase + AnimationIndex.CURRENT] =
                                    current;
                                this.writeSpriteRectFromFrame(
                                    sprite,
                                    sprBase,
                                    current
                                );
                            }
                        }
                    }
                }
            }
        );
    }

    /**
     * Zero‑alloc sprite rect write (best effort):
     * - If your spritesheet exposes a packed typed array `rects` (x,y,w,h per frame),
     *   we use it directly.
     * - Else, if it provides an out‑param API `frameRectInto(i, out4)`, we use that.
     * - Else we fall back to `frameRectFromIndex(i)` (may allocate); consider adding an out‑param API.
     */
    private writeSpriteRectFromFrame(
        sprite: any,
        sprBase: number,
        frameIndex: number
    ) {
        // Option 1: packed typed array (fastest, zero‑alloc)
        const rects: Int32Array | Uint16Array | undefined = (spritesheet as any)
            .rects;
        if (rects && (rects.length & 3) === 0) {
            const off = frameIndex << 2;
            sprite[sprBase + SpriteIndex.FRAME_X] = rects[off];
            sprite[sprBase + SpriteIndex.FRAME_Y] = rects[off + 1];
            sprite[sprBase + SpriteIndex.FRAME_WIDTH] = rects[off + 2];
            sprite[sprBase + SpriteIndex.FRAME_HEIGHT] = rects[off + 3];
            return;
        }

        // Option 2: out‑param API
        if (typeof (spritesheet as any).frameRectInto === "function") {
            (spritesheet as any).frameRectInto(frameIndex, this.rect4);
            sprite[sprBase + SpriteIndex.FRAME_X] = this.rect4[0];
            sprite[sprBase + SpriteIndex.FRAME_Y] = this.rect4[1];
            sprite[sprBase + SpriteIndex.FRAME_WIDTH] = this.rect4[2];
            sprite[sprBase + SpriteIndex.FRAME_HEIGHT] = this.rect4[3];
            return;
        }

        // Option 3: fallback (likely allocates a small tuple)
        const r = spritesheet.frameRectFromIndex(frameIndex) as readonly [
            number,
            number,
            number,
            number
        ];
        sprite[sprBase + SpriteIndex.FRAME_X] = r[0];
        sprite[sprBase + SpriteIndex.FRAME_Y] = r[1];
        sprite[sprBase + SpriteIndex.FRAME_WIDTH] = r[2];
        sprite[sprBase + SpriteIndex.FRAME_HEIGHT] = r[3];
    }
}
