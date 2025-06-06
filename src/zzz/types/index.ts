// // Recursive tuple builder
// type BuildTuple<L extends number, T, R extends T[] = []> = R["length"] extends L
//     ? R
//     : BuildTuple<L, T, [...R, T]>;

// // Final type
// export type FixedLengthArray<T, N extends number> = BuildTuple<N, T>;
// type Vec2 = FixedLengthArray<number, 2>; // [number, number]
// type Vec4 = FixedLengthArray<number, 4>; // [number, number, number, number]
// const pos: Vec2 = [0, 0]; // ✅ OK
// // const invalid: Vec2 = [0, 1, 2]; // ❌ Error: too many elements

// type ComponentValue<D extends EntityComponentDescriptor> = D["count"] extends 1
//     ? number
//     : FixedLengthArray<number, D["count"]>;

/**
 * Buffer type used to store entity component data.
 */
export type EntityComponentBuffer =
    | Float32Array
    | Int32Array
    | Uint32Array
    | Uint8Array;

/**
 * Numeric type uniquely identifying an entity component type.
 */
export type EntityComponentType = number & { __brand: "EntityComponentType" };

/**
 * Constructor for creating `EntityComponentBuffer` instances from `ArrayBuffer`.
 */
export interface EntityComponentBufferConstructor {
    readonly BYTES_PER_ELEMENT: number;
    new (
        buffer: ArrayBuffer,
        byteOffset: number,
        length: number
    ): EntityComponentBuffer;
}

/**
 * Metadata and configuration descriptor for an entity component.
 */
export interface EntityComponentDescriptor {
    buffer: EntityComponentBufferConstructor;
    type: EntityComponentType;
    name: string;
    count: number;
    default: number[];
    alignment?: number;
}

/**
 * Partial mapping associating entity component types (excluding type `0`) with numerical arrays.
 * Typically, these arrays represent entity references or component-specific indexes.
 */
// export type EntityComponentMap = Partial<Record<EntityComponentType, number[]>>;
export type EntityComponentMap = Partial<{
    [K in Exclude<EntityComponentType, 0>]: number[];
}>;

/**
 * Unique, strongly-typed identifier for entities within the ECS framework.
 */
export type EntityId = number & { __brand: "EntityId" };

/**
 * A branded type representing an archetype signature as a number.
 */
export type ArchetypeSignature = number & { __brand: "ArchetypeSignature" };

export type Archetype = {
    signature: ArchetypeSignature;
    types: EntityComponentType[];
    offsets: Map<EntityComponentType, number>;
    elementStride: number; // total size of the archetype in numbers of elements
    byteStride: number;
    descriptors: EntityComponentDescriptor[];
};
