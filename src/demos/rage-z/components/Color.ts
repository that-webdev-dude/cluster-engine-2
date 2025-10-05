import { Component } from "./Component";

/**
 * Color component
 * - RGBA color for rendering.
 */
export enum ColorIndex {
    R = 0,
    G = 1,
    B = 2,
    A = 3,
}

export const ColorDescriptor = {
    type: Component.Color,
    name: "Color",
    count: 4,
    buffer: Uint8Array,
    default: [255, 255, 255, 255],
    // prettier-ignore
    fields: [
        "r",
        "g",
        "b",
        "a",
    ],
} as const;
