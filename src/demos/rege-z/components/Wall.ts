import { Component } from "./Component";

/**
 * Wall tag component
 * - Marks an entity as a wall.
 */
export enum WallIndex {
    VALUE = 0,
}

export const WallDescriptor = {
    type: Component.Wall,
    name: "Wall",
    count: 1,
    buffer: Float32Array,
    default: [1],
    fields: ["value"],
} as const;
