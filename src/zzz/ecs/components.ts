// src/ecs/components.ts

import { BufferConstructor } from "./buffer";

export enum ComponentType {
    EntityId = 0,
    Position,
    Velocity,
    Radius,
    Size,
    Color,
    // Previous Position component - useful for smooth movement
    PreviousPosition,
}

export interface ComponentDescriptor {
    buffer: BufferConstructor;
    type: ComponentType;
    name: string;
    count: number;
    default: number[];
    alignment?: number;
}

export type ComponentAssignmentMap = Partial<{
    [K in Exclude<ComponentType, ComponentType.EntityId>]: number[];
}>;

export const DESCRIPTORS: readonly ComponentDescriptor[] = [
    {
        type: ComponentType.EntityId,
        name: "EntityId",
        count: 1,
        buffer: Uint32Array,
        default: [0], // overwritten at allocate()
    },
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
    // Previous Position component - useful for smooth movement
    {
        type: ComponentType.PreviousPosition,
        name: "PreviousPosition",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
] as const;
