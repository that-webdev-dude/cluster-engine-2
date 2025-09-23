import { Component } from "./Component";

/**
 * Camera component
 * - Spring camera state and look-ahead accumulators.
 */
export enum CameraIndex {
    SPRING_FREQ_X = 0,
    SPRING_FREQ_Y = 1,
    LOOK_AHEAD_X = 2,
    LOOK_AHEAD_Y = 3,
}

export const CameraDescriptor = {
    type: Component.Camera,
    name: "Camera",
    count: 4,
    buffer: Float32Array,
    default: [5, 5, 0, 0],
    // prettier-ignore
    fields: [
        "springFreqX",
        "springFreqY",
        "lookAheadX",
        "lookAheadY",
    ],
} as const;
