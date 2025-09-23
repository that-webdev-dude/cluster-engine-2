import { Component } from "./Component";

/**
 * Animation component
 * - Basic frame animation state.
 */
export enum AnimationIndex {
    START = 0,
    END = 1,
    CURRENT = 2,
    TIME = 3,
    ELAPSED = 4,
    PLAYING = 5,
}

export const AnimationDescriptor = {
    type: Component.Animation,
    name: "Animation",
    count: 6,
    buffer: Float32Array,
    default: [0, 0, 0, 0, 0, 0],
    // prettier-ignore
    fields: [
        "start",
        "end",
        "current",
        "time",
        "elapsed",
        "playing",
    ],
} as const;
