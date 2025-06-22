import { Archetype } from "../../../cluster/ecs/archetype";
// import { ComponentDescriptor } from "../../../cluster/types";

export enum Component {
    PreviousPosition,
    Position,
    Offset,
    Angle,
    Pivot,
    Size,
    Color,
    Velocity,
    Health,
    Player,
    Bullet,
    Meteor,
    Camera,
    // Life,
    // Score,
    // Shake,
    // SpawnInterval,
    // UIElement,
}

const DESCRIPTORS = Archetype.register(
    ...[
        {
            type: Component.PreviousPosition,
            name: "PreviousPosition",
            count: 2,
            buffer: Float32Array,
            default: [0, 0],
        },
        {
            type: Component.Position,
            name: "Position",
            count: 2,
            buffer: Float32Array,
            default: [0, 0],
        },
        {
            type: Component.Offset,
            name: "Offset",
            count: 2,
            buffer: Float32Array,
            default: [0, 0],
        },
        {
            type: Component.Angle,
            name: "Angle",
            count: 1,
            buffer: Float32Array,
            default: [0], // in radians
        },
        {
            type: Component.Pivot,
            name: "Pivot",
            count: 2,
            buffer: Float32Array,
            default: [0, 0],
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
            type: Component.Velocity,
            name: "Velocity",
            count: 2,
            buffer: Float32Array,
            default: [20, 21],
        },
        {
            type: Component.Health,
            name: "Health",
            count: 1,
            buffer: Uint32Array,
            default: [0], // in radians
        },

        // tag components
        {
            type: Component.Player,
            name: "Player",
            count: 1,
            buffer: Uint8Array,
            default: [1], // means "is Player"
        },
        {
            type: Component.Bullet,
            name: "Bullet",
            count: 1,
            buffer: Uint8Array,
            default: [1], // means "is Bullet"
        },
        {
            type: Component.Meteor,
            name: "Meteor",
            count: 1,
            buffer: Uint8Array,
            default: [1], // means "is Meteor"
        },
        {
            type: Component.Camera,
            name: "Camera",
            count: 1,
            buffer: Uint8Array,
            default: [1], // means "is Camera"
        },
    ]
);

// export const DESCRIPTORS: readonly ComponentDescriptor[] = [
//     {
//         type: Component.PreviousPosition,
//         name: "PreviousPosition",
//         count: 2,
//         buffer: Float32Array,
//         default: [0, 0],
//     },
//     {
//         type: Component.Position,
//         name: "Position",
//         count: 2,
//         buffer: Float32Array,
//         default: [10, 11],
//     },
//     {
//         type: Component.Angle,
//         name: "Angle",
//         count: 1,
//         buffer: Float32Array,
//         default: [0], // in radians
//     },
//     {
//         type: Component.Pivot,
//         name: "Pivot",
//         count: 2,
//         buffer: Float32Array,
//         default: [0, 0],
//     },
//     {
//         type: Component.Size,
//         name: "Size",
//         count: 2,
//         buffer: Float32Array,
//         default: [1, 1],
//     },
//     {
//         type: Component.Color,
//         name: "Color",
//         count: 4,
//         buffer: Uint8Array,
//         default: [255, 255, 255, 255],
//     },
//     {
//         type: Component.Velocity,
//         name: "Velocity",
//         count: 2,
//         buffer: Float32Array,
//         default: [20, 21],
//     },
//     {
//         type: Component.Health,
//         name: "Health",
//         count: 1,
//         buffer: Uint32Array,
//         default: [0], // in radians
//     },
// ] as const;

// Archetype.register(...DESCRIPTORS);

export { DESCRIPTORS };
