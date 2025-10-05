import { Component } from "./Component";

/**
 * AABB component
 * - Axis-aligned bounding box (minX, minY, maxX, maxY).
 */
export enum AABBIndex {
    MIN_X = 0,
    MIN_Y = 1,
    MAX_X = 2,
    MAX_Y = 3,
}

export const AABBDescriptor = {
    type: Component.AABB,
    name: "AABB",
    count: 4,
    buffer: Float32Array,
    default: [0, 0, 0, 0],
    // prettier-ignore
    fields: [
        "minX",
        "minY",
        "maxX",
        "maxY",
    ],
} as const;
