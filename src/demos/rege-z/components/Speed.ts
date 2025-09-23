import { Component } from "./Component";

/**
 * Speed component
 * - Scalar speed value used by movement systems.
 */
export enum SpeedIndex {
    VALUE = 0,
}

export const SpeedDescriptor = {
    type: Component.Speed,
    name: "Speed",
    count: 1,
    buffer: Float32Array,
    default: [0],
    // prettier-ignore
    fields: [
        "value",
    ],
} as const;
