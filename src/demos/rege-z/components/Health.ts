import { Component } from "./Component";

/**
 * Health component
 * - Non-negative hit points of an entity.
 */
export enum HealthIndex {
    VALUE = 0,
}

export const HealthDescriptor = {
    type: Component.Health,
    name: "Health",
    count: 1,
    buffer: Uint32Array,
    default: [0],
    // prettier-ignore
    fields: [
        "value",
    ],
} as const;
