/** Buffer type used to store entity component data. */
export type Buffer = Float32Array | Int32Array | Uint32Array | Uint8Array;

/** Constructor for creating `Buffer` instances from `ArrayBuffer`. */
export interface BufferConstructor {
    readonly BYTES_PER_ELEMENT: number;
    new (buffer: ArrayBuffer, byteOffset: number, length: number): Buffer;
}

/** Numeric type uniquely identifying an entity component type. */
export enum ComponentType {
    EntityId = 0,
    Position,
    Velocity,
    Radius,
    Size,
    Color,
    PreviousPosition,
}

/** Partial mapping associating entity component types (excluding type `0`) with numerical arrays. */
export type ComponentMap = Partial<{
    [K in Exclude<ComponentType, 0>]: number[];
}>;

/** Metadata and configuration descriptor for an entity component. */
export interface ComponentDescriptor {
    buffer: BufferConstructor;
    type: ComponentType;
    name: string;
    count: number;
    default: number[];
    alignment?: number;
}

/** Unique, strongly-typed identifier for entities within the ECS framework. */
export type EntityId = number & { __brand: "EntityId" };

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
