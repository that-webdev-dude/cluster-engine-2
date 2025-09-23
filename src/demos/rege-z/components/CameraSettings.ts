import { Component } from "./Component";

/**
 * CameraSettings component
 * - Tunables for spring follow camera and dead zone behavior.
 */
export enum CameraSettingsIndex {
    DEAD_ZONE_W_PERC = 0,
    DEAD_ZONE_H_PERC = 1,
    LOOK_AHEAD_GAIN_PER_SEC = 2,
    LOOK_AHEAD_MAX_OFFSET = 3,
    LOOK_AHEAD_TAU = 4,
    DEAD_BAND_ENTER = 5,
    DEAD_BAND_EXIT = 6,
    AIRBORNE_Y_SCALE = 7,
    FLAGS = 8,
}

export const CameraSettingsDescriptor = {
    type: Component.CameraSettings,
    name: "CameraSettings",
    count: 9,
    buffer: Float32Array,
    default: [0.28, 0.2, 0.2, 96, 0.08, 8, 10, 0.0, 0],
    fields: [
        "deadZoneWPerc",
        "deadZoneHPerc",
        "lookAheadGainPerSec",
        "lookAheadMaxOffset",
        "lookAheadTau",
        "deadBandEnter",
        "deadBandExit",
        "airborneYScale",
        "flags",
    ],
} as const;
