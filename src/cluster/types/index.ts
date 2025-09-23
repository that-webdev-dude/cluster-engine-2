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

export type ComponentValue = ReadonlyArray<number>;

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
 * Enhanced component descriptor with property documentation
 */
export type ComponentDescriptor = Readonly<{
    buffer: BufferConstructor;
    type: ComponentType;
    name: ComponentName;
    count: ComponentCount;
    default: ComponentValue;
    alignment?: ComponentAlignement;
    fields: ReadonlyArray<string>;
}>;

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
