import type { Archetype } from "../ecs/archetype";

/**
 * Buffer related types
 * used to store entity component data.
 */
export type Buffer = Float32Array | Int32Array | Uint32Array | Uint8Array;

export type BufferConstructor = {
    readonly BYTES_PER_ELEMENT: number;
    new (buffer: ArrayBuffer, byteOffset: number, length: number): Buffer;
};

/**
 * Component related types
 * used to represent and describe an entity component
 */
export type ComponentType = number;

export type ComponentValue = number[];

export type ComponentName = string;

export type ComponentCount = number;

export type ComponentAlignement = number;

export type ComponentValueMap = Record<ComponentType, ComponentValue>;

/**
 * Property enum definition for component descriptors
 * Maps string names to numeric values for semantic meaning
 */
export interface ComponentPropertyEnum {
    [key: string]: number;
}

/**
 * Component property documentation
 * Provides semantic meaning to numeric values in component arrays
 */
export interface ComponentProperty {
    name: string;
    value: number;
    description?: string;
}

/**
 * Enhanced component descriptor with property documentation
 */
export interface ComponentDescriptor {
    buffer: BufferConstructor;
    type: ComponentType;
    name: ComponentName;
    count: ComponentCount;
    default: ComponentValue;
    alignment?: ComponentAlignement;
}

/**
 * Enhanced component descriptor with property documentation and enums
 */
export interface ComponentDescriptor2 {
    buffer: BufferConstructor;
    type: ComponentType;
    name: ComponentName;
    count: ComponentCount;
    default: ComponentValue;
    alignment?: ComponentAlignement;
    props?: ComponentPropertyEnum;
    propertyDocs?: ComponentProperty[];
}

// // Example usage with proper enum definition
// export const PositionProps = {
//     X: 0,
//     Y: 1,
// } as const;

// export const VelocityProps = {
//     VEL_X: 0,
//     VEL_Y: 1,
// } as const;

// // Example component descriptor with enum properties
// const positionComponent: ComponentDescriptor2 = {
//     buffer: Float32Array,
//     type: 0,
//     name: "position",
//     count: 2,
//     default: [0, 0],
//     alignment: 1,
//     props: PositionProps,
//     propertyDocs: [
//         { name: "X", value: 0, description: "X coordinate" },
//         { name: "Y", value: 1, description: "Y coordinate" },
//     ],
// };

// const velocityComponent: ComponentDescriptor2 = {
//     buffer: Float32Array,
//     type: 1,
//     name: "velocity",
//     count: 2,
//     default: [0, 0],
//     alignment: 1,
//     props: VelocityProps,
//     propertyDocs: [
//         { name: "VEL_X", value: 0, description: "X velocity component" },
//         { name: "VEL_Y", value: 1, description: "Y velocity component" },
//     ],
// };

/**
 * Entity related types
 * to represent entity ids and meta data
 */
export type EntityId = number;

export type EntityMeta = {
    archetype: Archetype<any>;
    chunkId: number;
    row: number;
    generation: number;
};
