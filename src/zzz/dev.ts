import type { ComponentDescriptor } from "./types";
import { Archetype } from "./ecs/archetypeV2";

export enum ComponentType {
    EntityId = 0,
    Position,
    Velocity,
    Radius,
    Size,
    Color,
    PreviousPosition,
}

export const DESCRIPTORS: readonly ComponentDescriptor[] = [
    {
        type: ComponentType.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [10, 11],
    },
    {
        type: ComponentType.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [20, 21],
    },
    {
        type: ComponentType.Radius,
        name: "Radius",
        count: 1,
        buffer: Float32Array,
        default: [1],
    },
    {
        type: ComponentType.Size, // width and height
        name: "Size",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
    },
    {
        type: ComponentType.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255],
    },
    {
        type: ComponentType.PreviousPosition,
        name: "PreviousPosition",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
] as const;

Archetype.register(...DESCRIPTORS);

export default () => {};
