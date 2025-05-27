// src/ecs/archetype.ts

import { ComponentType, DESCRIPTORS } from "./components";

/** public type */
export interface Archetype {
    signature: number;
    types: ComponentType[];
    offsets: Map<ComponentType, number>;
    elementStride: number; // total size of the archetype in numbers of elements
    byteStride: number;
}

/** private state */
type Signature = number;

const cache: Map<Signature, Archetype> = new Map();

/** private helpers */
function sortComponentTypes(types: ComponentType[]): ComponentType[] {
    return types.sort((a, b) => a - b);
}

function makeSignature(types: ComponentType[]): number {
    return types.reduce((mask, t) => mask | (1 << t), 0);
}

/** public factory */
export function getArchetype(userTypes: ComponentType[]): Archetype {
    let types = [...new Set([...userTypes, ComponentType.EntityId])]; // Copy to avoid mutation

    const signature = makeSignature(types);
    if (cache.has(signature)) return cache.get(signature)!;

    types = sortComponentTypes(types);
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

    return archetype;
}

/* convenience helpers (optional) */
export function has(archetype: Archetype, comp: ComponentType): boolean {
    return (archetype.signature & (1 << comp)) !== 0;
}

export function offsetOf(archetype: Archetype, comp: ComponentType): number {
    const v = archetype.offsets.get(comp);
    if (v == null) throw new Error("component not in archetype");
    return v;
}

/* debug utilities (optional, dev-only) */
export function pretty(archetype: Archetype): string {
    const names = archetype.types.map((t) => ComponentType[t]).join(",");
    return `Archetype<${names}>  stride=${archetype.byteStride}B`;
}
