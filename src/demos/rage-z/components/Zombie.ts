import { Component } from "./Component";

/**
 * Zombie tag component
 * - Marks an entity as a zombie.
 */
export enum ZombieIndex {
    VALUE = 0,
}

export const ZombieDescriptor = {
    type: Component.Zombie,
    name: "Zombie",
    count: 1,
    buffer: Uint8Array,
    default: [1],
    fields: ["value"],
} as const;
