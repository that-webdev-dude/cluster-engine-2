import { Component } from "./Component";

/**
 * Camera component
 * - Camera general state.
 */
export enum CameraIndex {
    ENABLED = 0,
    LEAD_TIME = 1,
    BASE_DISTANCE = 2,
    SPEED_CURVE_K = 3,
    DIR_SHARPNESS = 4,
    ENABLE_SPEED_ENTER = 5,
    ENABLE_SPEED_EXIT = 6,
    MAX_OFFSET = 7,
    FADE_ON_HALF_LIFE = 8,
    FADE_OFF_HALF_LIFE = 9,
    TELEPORT_THRESHOLD = 10,
    SNAP_MAX_SPEED = 11,
    LOOK_DIR_X = 12,
    LOOK_DIR_Y = 13,
    LOOK_ACTIVE = 14,
    LOOK_WEIGHT = 15,
}

export const CameraDescriptor = {
    type: Component.Camera,
    name: "Camera",
    count: 16,
    buffer: Float32Array,
    default: [
        1, // enabled
        0.25, // leadTime (seconds)
        64, // baseDistance (pixels)
        5, // speedCurveK
        400, // dirSharpness
        0.6, // enableSpeedEnter
        0.4, // enableSpeedExit
        180, // maxOffset (pixels)
        0.06, // fadeOnHalfLife (seconds)
        0.18, // fadeOffHalfLife (seconds)
        160, // teleportThreshold (pixels/frame)
        5000, // snapMaxSpeed (px/s)
        1, // lookDirX
        0, // lookDirY
        0, // lookActive
        0, // lookWeight
    ],
    // prettier-ignore
    fields: [
        "enabled",
        "leadTime",
        "baseDistance",
        "speedCurveK",
        "dirSharpness",
        "enableSpeedEnter",
        "enableSpeedExit",
        "maxOffset",
        "fadeOnHalfLife",
        "fadeOffHalfLife",
        "teleportThreshold",
        "snapMaxSpeed",
        "lookDirX",
        "lookDirY",
        "lookActive",
        "lookWeight",
    ],
} as const;
