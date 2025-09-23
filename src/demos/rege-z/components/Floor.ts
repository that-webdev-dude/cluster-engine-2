import { Component } from "./Component";

/**
 * Floor tag component
 * - Marks an entity as walkable floor.
 */
export enum FloorIndex {
    VALUE = 0,
}

export const FloorDescriptor = {
    type: Component.Floor,
    name: "Floor",
    count: 1,
    buffer: Float32Array,
    default: [1],
    fields: ["value"],
} as const;
