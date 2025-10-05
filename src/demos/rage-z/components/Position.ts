import { Component } from "./Component";

/**
 * Position component
 * - Tracks current, previous, and AABB bounds of an entity in world space.
 */
export enum PositionIndex {
    X = 0,
    Y = 1,
    PREV_X = 2,
    PREV_Y = 3,
    MIN_X = 4,
    MIN_Y = 5,
    MAX_X = 6,
    MAX_Y = 7,
}

export const PositionDescriptor = {
    type: Component.Position,
    name: "Position",
    count: 8,
    buffer: Float32Array,
    // currX, currY, prevX, prevY, minx, minY, maxX, maxY
    default: [0, 0, 0, 0, 0, 0, 0, 0],
    // prettier-ignore
    fields: [
        "x",
        "y",
        "prevX",
        "prevY",
        "minX",
        "minY",
        "maxX",
        "maxY",
    ],
} as const;
