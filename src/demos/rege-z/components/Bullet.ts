import { Component } from "./Component";

/**
 * Bullet tag component
 * - Presence indicates the entity is a bullet.
 */
export enum BulletIndex {
    VALUE = 0,
}

export const BulletDescriptor = {
    type: Component.Bullet,
    name: "Bullet",
    count: 1,
    buffer: Uint8Array,
    default: [1],
    fields: ["value"],
} as const;
