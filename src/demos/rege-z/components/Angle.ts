import { Component } from "./Component";

/**
 * Angle component
 * - Orientation in radians.
 */
export enum AngleIndex {
    RADIANS = 0,
}

export const AngleDescriptor = {
    type: Component.Angle,
    name: "Angle",
    count: 1,
    buffer: Float32Array,
    default: [0],
    // prettier-ignore
    fields: [
        "radians",
    ],
} as const;
