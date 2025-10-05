import { Component } from "./Component";

/**
 * Offset component
 * - Local offset applied to rendering or physics relative to `Position`.
 */
export enum OffsetIndex {
    X = 0,
    Y = 1,
}

export const OffsetDescriptor = {
    type: Component.Offset,
    name: "Offset",
    count: 2,
    buffer: Float32Array,
    default: [0, 0],
    // prettier-ignore
    fields: [
        "x",
        "y",
    ],
} as const;
