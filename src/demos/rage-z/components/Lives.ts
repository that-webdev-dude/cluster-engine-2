import { Component } from "./Component";

/**
 * Lives component
 * - Remaining lives or retries.
 */
export enum LivesIndex {
    VALUE = 0,
}

export const LivesDescriptor = {
    type: Component.Lives,
    name: "Lives",
    count: 1,
    buffer: Uint32Array,
    default: [0],
    // prettier-ignore
    fields: [
        "value",
    ],
} as const;
