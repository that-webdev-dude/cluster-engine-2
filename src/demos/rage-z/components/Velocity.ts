import { Component } from "./Component";

/**
 * Velocity component
 * - Velocity vector used by physics and movement.
 */
export enum VelocityIndex {
    X = 0,
    Y = 1,
}

export const VelocityDescriptor = {
    type: Component.Velocity,
    name: "Velocity",
    count: 2,
    buffer: Float32Array,
    default: [0, 0],
    // prettier-ignore
    fields: [
        "x",
        "y",
    ],
} as const;
