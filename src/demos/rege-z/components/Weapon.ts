import { Component } from "./Component";

/**
 * Weapon component
 * - Indicates weapon state, currently only active flag.
 */
export enum WeaponIndex {
    ACTIVE,
    AMMO,
    COOLDOWN, // in ms
    LAST_FIRED, // timestamp in ms
}

export const WeaponDescriptor = {
    type: Component.Weapon,
    name: "Weapon",
    count: 4,
    buffer: Uint8Array,
    default: [1, 0, 0, 0],
    fields: ["active", "ammo", "cooldown", "last_fired"],
} as const;
