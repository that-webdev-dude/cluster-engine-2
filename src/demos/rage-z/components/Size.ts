import { Component } from "./Component";

/**
 * Size component
 * - Width and height in world units.
 */
export enum SizeIndex {
    WIDTH = 0,
    HEIGHT = 1,
}

export const SizeDescriptor = {
    type: Component.Size,
    name: "Size",
    count: 2,
    buffer: Float32Array,
    default: [1, 1],
    // prettier-ignore
    fields: [
        "x",
        "y",
    ],
} as const;
