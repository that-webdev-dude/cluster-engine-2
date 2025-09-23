import { Component } from "./Component";

/**
 * Pivot component
 * - Local origin for rotation/scaling relative to the sprite.
 */
export enum PivotIndex {
    X = 0,
    Y = 1,
}

export const PivotDescriptor = {
    type: Component.Pivot,
    name: "Pivot",
    count: 2,
    buffer: Float32Array,
    default: [0, 0],
    // prettier-ignore
    fields: [
        "x",
        "y",
    ],
} as const;
