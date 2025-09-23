import { Component } from "./Component";

/**
 * Weapon component
 * - Indicates weapon state, currently only active flag.
 */
export enum WeaponIndex {
    ACTIVE = 0,
}

export const WeaponDescriptor = {
    type: Component.Weapon,
    name: "Weapon",
    count: 1,
    buffer: Uint8Array,
    default: [1],
    fields: ["active"],
} as const;
