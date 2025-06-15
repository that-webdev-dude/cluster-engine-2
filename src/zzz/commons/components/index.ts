import { ComponentDescriptor } from "../../types";

export enum Component {
    Position,
    Velocity,
    Radius,
    Size,
    Color,
    PreviousPosition,
    LifeSpan,
    InputKey,
    Visible,
    Camera,
}

export const DESCRIPTORS: readonly ComponentDescriptor[] = [
    {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [10, 11],
    },
    {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [20, 21],
    },
    {
        type: Component.Radius,
        name: "Radius",
        count: 1,
        buffer: Float32Array,
        default: [1],
    },
    {
        type: Component.Size,
        name: "Size",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
    },
    {
        type: Component.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255],
    },
    {
        type: Component.PreviousPosition,
        name: "PreviousPosition",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    {
        type: Component.LifeSpan,
        name: "LifeSpan",
        count: 1,
        buffer: Float32Array,
        default: [1], // in ms
    },
    {
        type: Component.InputKey,
        name: "InputKey",
        count: 2,
        buffer: Uint8Array,
        default: [0, 0],
    },
    {
        type: Component.Visible,
        name: "Visible",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means visible
    },
    {
        type: Component.Camera,
        name: "Camera",
        count: 1,
        buffer: Float32Array,
        default: [0], // means speed
    },
] as const;
