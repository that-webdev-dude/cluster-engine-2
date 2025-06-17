import { ComponentDescriptor } from "../../types";

export enum Component {
    PreviousPosition,
    Position,
    Velocity,
    Radius,
    Size,
    Color,
    LifeSpan,
    InputKey,
    Visible,
    Camera,
}

export const DESCRIPTORS: readonly ComponentDescriptor[] = [
    /**
     * Stores the previous position (x, y) of an entity.
     */
    {
        type: Component.PreviousPosition,
        name: "PreviousPosition",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    /**
     * Stores the current position (x, y) of an entity.
     */
    {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [10, 11],
    },
    /**
     * Stores the velocity (vx, vy) of an entity.
     */
    {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [20, 21],
    },
    /**
     * Stores the radius of an entity.
     */
    {
        type: Component.Radius,
        name: "Radius",
        count: 1,
        buffer: Float32Array,
        default: [1],
    },
    /**
     * Stores the size (width, height) of an entity.
     */
    {
        type: Component.Size,
        name: "Size",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
    },
    /**
     * Stores the color (RGBA) of an entity.
     */
    {
        type: Component.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255],
    },
    /**
     * Stores the lifespan (in ms) of an entity.
     */
    {
        type: Component.LifeSpan,
        name: "LifeSpan",
        count: 1,
        buffer: Float32Array,
        default: [1], // in ms
    },
    /**
     * Stores input key states for an entity.
     */
    {
        type: Component.InputKey,
        name: "InputKey",
        count: 2,
        buffer: Uint8Array,
        default: [0, 0],
    },
    /**
     * Indicates whether the entity is visible.
     */
    {
        type: Component.Visible,
        name: "Visible",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means visible
    },
    /**
     * Stores camera-related data (e.g., speed).
     */
    {
        type: Component.Camera,
        name: "Camera",
        count: 1,
        buffer: Float32Array,
        default: [0], // means speed
    },
] as const;
