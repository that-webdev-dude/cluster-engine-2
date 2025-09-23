import { Component } from "./Component";

/**
 * Player tag component
 * - Presence indicates the entity is the player.
 */
export enum PlayerIndex {
    VALUE = 0,
}

export const PlayerDescriptor = {
    type: Component.Player,
    name: "Player",
    count: 1,
    buffer: Uint8Array,
    default: [1],
    fields: ["value"],
} as const;
