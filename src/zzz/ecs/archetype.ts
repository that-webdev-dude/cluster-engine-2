import { DESCRIPTORS } from "./components";
import { Obj } from "../tools";
import { ComponentType } from "../types";
import type { Signature } from "../types";

/**  cache for already backed archetypes */
const cache: Map<Signature, Archetype> = new Map();

/** utility to compute the signature from a provided list of component types */
function makeSignature(...comps: ComponentType[]): Signature {
    const signature = comps.reduce((mask, t) => mask | (1 << t), 0);
    return signature as Signature;
}

/** creates a brand new archetype */
function create(...comps: ComponentType[]): Archetype {
    let types = [...new Set([...comps, ComponentType.EntityId])].sort(
        (a, b) => a - b
    );

    const signature = makeSignature(...types);

    const existing = cache.get(signature);
    if (existing) return existing;

    let byteStride = 0;
    let elementStride = 0;
    const offsets = new Map<ComponentType, number>();

    for (const type of types) {
        const descriptor = DESCRIPTORS[type];
        const align =
            descriptor.alignment ?? descriptor.buffer.BYTES_PER_ELEMENT;

        // Align byteStride to the descriptor's alignment
        byteStride = (byteStride + align - 1) & ~(align - 1);

        offsets.set(type, byteStride);

        elementStride += descriptor.count;
        byteStride += descriptor.count * descriptor.buffer.BYTES_PER_ELEMENT;
    }

    const archetype: Archetype = {
        signature,
        types,
        offsets,
        byteStride,
        elementStride,
    };

    cache.set(signature, archetype);

    Obj.deepFreze(archetype); // make the archetype deep-immutable

    return archetype;
}

/** returns true if the archetype has _exactly_ these comps (plus EntityId) */
function matches(arch: Archetype, ...comps: ComponentType[]): boolean {
    const reqMask = makeSignature(...comps, ComponentType.EntityId); // archetypes always include EntityId under the hood
    return arch.signature === reqMask;
}

/** returns true if _all_ of the requested comps are present */
function includes(arch: Archetype, ...comps: ComponentType[]): boolean {
    const reqMask = makeSignature(...comps);
    return (arch.signature & reqMask) === reqMask;
}

/* utility to pretty print the provided archetype */
function format(arch: Archetype): string {
    return `Archetype<${arch.types
        .map((t) => ComponentType[t])
        .join(",")}> stride=${arch.byteStride}B`;
}

/** metadata descriptor for an archetype */
export type Archetype = {
    readonly signature: Signature;
    readonly types: readonly ComponentType[];
    readonly offsets: ReadonlyMap<ComponentType, number>;
    readonly byteStride: number;
    readonly elementStride: number;
};

/** Namespace Archetype */
export const Archetype = {
    create,
    matches,
    includes,
    format,
};
