import { Component } from "./Component";

/**
 * Sprite component
 * - Source rectangle in a sprite sheet for rendering.
 */
export enum SpriteIndex {
    FRAME_X = 0,
    FRAME_Y = 1,
    FRAME_WIDTH = 2,
    FRAME_HEIGHT = 3,
}

export const SpriteDescriptor = {
    type: Component.Sprite,
    name: "Sprite",
    count: 4,
    buffer: Float32Array,
    default: [0, 0, 0, 0],
    // prettier-ignore
    fields: [
        "frameX",
        "frameY",
        "frameWidth",
        "frameHeight",
    ],
} as const;
