import { Component } from "./Component";

/**
 * Tile tag component
 * - Marks an entity as a tile.
 */
export enum TileIndex {
    VALUE = 0,
}

export const TileDescriptor = {
    type: Component.Tile,
    name: "Tile",
    count: 1,
    buffer: Float32Array,
    default: [1],
    fields: ["value"],
} as const;
