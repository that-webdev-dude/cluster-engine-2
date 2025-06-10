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

export interface ComponentDescriptor {
    buffer: BufferConstructor;
    type: ComponentType;
    name: ComponentName;
    count: ComponentCount;
    default: ComponentValue;
    alignment?: ComponentAlignement;
}

/** Unique, strongly-typed identifier for entities within the ECS framework. */
export type EntityId = number;

/** A branded type representing an archetype signature as a number. */
export type Signature = number & { __brand: "Signature" };

// /** metadata descriptor for an archetype */
// export type Archetype = {
//     readonly signature: Signature;
//     readonly types: readonly ComponentType[];
//     readonly offsets: ReadonlyMap<ComponentType, number>;
//     readonly byteStride: number;
//     readonly elementStride: number;
// };
