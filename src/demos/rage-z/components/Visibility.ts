import { Component } from "./Component";

/** Visibility flag used for camera-based culling */
export enum VisibilityIndex {
    VISIBLE = 0,
}

export const VisibilityDescriptor = {
    type: Component.Visibility,
    name: "Visibility",
    count: 1,
    buffer: Uint8Array,
    default: [1],
    fields: ["visible"],
} as const;
