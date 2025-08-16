import { ComponentDescriptor, ComponentType } from "../types";
import { Obj } from "../tools";

export type Signature = number;

/**
 * Generic archetype metadata type
 */
export type Archetype<S extends readonly ComponentDescriptor[]> = {
    readonly name: string;
    readonly signature: Signature;
    readonly types: readonly ComponentType[];
    readonly descriptors: ReadonlyMap<ComponentType, ComponentDescriptor>;
    readonly offsets: ReadonlyMap<ComponentType, number>;
    readonly byteStride: number;
    readonly elementStride: number;
    readonly maxEntities?: number;
    readonly schema: S;
};

function makeSignature(...types: ComponentType[]): Signature {
    return types.reduce((mask, t) => mask | (1 << t), 0);
}

function register<S extends readonly ComponentDescriptor[]>(...desc: S): S {
    const seen = new Set<string>();
    for (const d of desc) {
        if (seen.has(d.name)) {
            throw new Error(
                `Archetype.register: Duplicate descriptor name "${d.name}". Use unique names.`
            );
        }
        seen.add(d.name);
    }
    return desc;
}

function create<S extends readonly ComponentDescriptor[]>(
    name: string,
    schema: S,
    maxEntities?: number
): Archetype<S> {
    const descriptors = new Map<ComponentType, ComponentDescriptor>();
    const offsets = new Map<ComponentType, number>();
    const types = schema.map((d) => d.type).sort((a, b) => a - b);

    let byteStride = 0;
    let elementStride = 0;

    for (const desc of schema) {
        const align = desc.alignment ?? desc.buffer.BYTES_PER_ELEMENT;
        byteStride = (byteStride + align - 1) & ~(align - 1);
        offsets.set(desc.type, byteStride);
        byteStride += desc.count * desc.buffer.BYTES_PER_ELEMENT;
        elementStride += desc.count;
        descriptors.set(desc.type, desc);
    }

    const archetype: Archetype<S> = {
        name,
        signature: makeSignature(...types),
        types,
        descriptors,
        offsets,
        byteStride,
        elementStride,
        maxEntities,
        schema,
    };

    Obj.deepFreze(archetype); // Optional: make immutable if available

    return archetype;
}

function matches<S extends readonly ComponentDescriptor[]>(
    arch: Archetype<S>,
    ...comps: ComponentType[]
): boolean {
    return arch.signature === makeSignature(...comps);
}

function includes<S extends readonly ComponentDescriptor[]>(
    arch: Archetype<S>,
    ...comps: ComponentType[]
): boolean {
    const req = makeSignature(...comps);
    return (arch.signature & req) === req;
}

function format<S extends readonly ComponentDescriptor[]>(
    arch: Archetype<S>
): string {
    return `Archetype.${arch.name}<${arch.schema
        .map((d) => d.name)
        .join(", ")}> stride = ${arch.byteStride} bytes`;
}

export const Archetype = {
    create,
    register,
    matches,
    includes,
    format,
    makeSignature,
};
