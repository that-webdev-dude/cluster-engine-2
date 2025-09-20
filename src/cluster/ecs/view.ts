import type { Chunk } from "./chunk";
import type { Storage } from "./storage";
import type { Signature } from "./archetype";
import type {
    ComponentDescriptor,
    ComponentValue,
    ComponentType,
    EntityMeta,
    Buffer,
} from "../types";
import { Archetype } from "./archetype";
import { DEBUG } from "../tools";

export class View {
    constructor(private readonly archetypeMap: Map<Signature, Storage<any>>) {}

    getSlice<T extends Buffer>(
        meta: EntityMeta,
        descriptor: ComponentDescriptor
    ): { arr: T; base: number } | undefined {
        const { archetype, chunkId, row, generation } = meta;

        const storage = this.archetypeMap.get(archetype.signature);
        if (!storage) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: No storage found for archetype signature ${Archetype.format(
                        archetype
                    )}`
                );
            }
            return undefined;
        }

        const chunk = storage.getChunk(chunkId);
        if (!chunk) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: No chunk found for chunkId ${chunkId} in archetype ${Archetype.format(
                        archetype
                    )}`
                );
            }
            return undefined;
        }

        if (generation !== chunk.getGeneration(row)) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: Generation mismatch for entity at row ${row} in chunk ${chunkId}`
                );
            }
            return undefined;
        }

        const arr = chunk.getView<T>(descriptor);
        if (!arr) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: No view found for descriptor ${descriptor.name} in chunk ${chunkId}`
                );
            }
            return undefined;
        }

        const base = row * descriptor.count;
        // return view.subarray(base, base + descriptor.count) as T;
        return { arr, base };
    }

    setSlice(
        meta: EntityMeta,
        descriptor: ComponentDescriptor,
        comps: ComponentValue
    ) {
        const s = this.getSlice(meta, descriptor);
        if (!s) return false;
    }

    forEachChunkWith(
        comps: ComponentType[],
        cb: (chunk: Readonly<Chunk<any>>, chunkId: number) => void
    ) {
        const sig = Archetype.makeSignature(...comps);
        for (const [archSig, storage] of this.archetypeMap) {
            if ((archSig & sig) === sig) {
                storage.forEachChunk(cb);
            }
        }
    }
}

type FieldAccess<D extends ComponentDescriptor> = {
    /** Read: f(i) -> number;  Write: f(i, value) -> void */
    [K in D["fields"][number]]: (i: number, value?: number) => number | void;
};

export type SoAView<D extends ComponentDescriptor> = FieldAccess<D> & {
    /** Bind the underlying typed array view for this chunk */
    bind(view: InstanceType<D["buffer"]>): SoAView<D>;
};

export function SoAViewFactory<D extends ComponentDescriptor>(desc: D) {
    type ViewT = InstanceType<D["buffer"]>;
    let view: ViewT | null = null;
    const stride = desc.count;

    const api: any = {
        bind(v: ViewT) {
            view = v;
            return api;
        },
    };

    // Generate per-field accessors: f(i) -> read, f(i, v) -> write
    for (let f = 0; f < desc.fields.length; f++) {
        const fname = desc.fields[f];
        api[fname] = (i: number, v?: number) => {
            if (!view) throw new Error("SoAView: no view bound");
            const idx = i * stride + f;
            if (v === undefined) return view[idx];
            view[idx] = v;
        };
    }

    return api as SoAView<D>;
}
