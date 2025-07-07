import { Buffer, ComponentDescriptor } from "../types";
import { ArchetypeV2 } from "./archetypeV2";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

type ComponentViews<D extends readonly ComponentDescriptor[]> = {
    [K in D[number] as K["name"]]: InstanceType<K["buffer"]>;
};

export class ChunkV2<S extends readonly ComponentDescriptor[]> {
    static readonly DEFAULT_CAPACITY = 256;

    static readonly HEADER_BYTE_SIZE = 32; // size of the header in bytes, can be used for metadata

    private buffer: ArrayBuffer | null;

    private header: DataView | null; // can be used for metadata, e.g., chunk ID, version, etc.

    private destroyed: boolean = false;

    private generations: Uint32Array;

    readonly views: ComponentViews<S>;

    readonly capacity: number;

    constructor(readonly archetype: ArchetypeV2<S>) {
        this.capacity = archetype.maxEntities || ChunkV2.DEFAULT_CAPACITY;

        const payloadBytes = this.capacity * archetype.byteStride;

        this.generations = new Uint32Array(this.capacity);

        this.buffer = new ArrayBuffer(ChunkV2.HEADER_BYTE_SIZE + payloadBytes);

        this.header = new DataView(this.buffer, 0, ChunkV2.HEADER_BYTE_SIZE); // Initialize the header

        this.header.setUint32(0, 0, true); // Initialize count to 0

        this.views = this.buildViews();

        Object.freeze(this.views);
    }

    /* _______________ public API _______________ */
    get byteCapacity(): number {
        this.assertAlive();
        return (
            ChunkV2.HEADER_BYTE_SIZE + this.capacity * this.archetype.byteStride
        );
    }

    get count(): number {
        this.assertAlive();
        return this.header ? this.header.getUint32(0, true) : 0; // Assuming the count is stored at the start of the header
    }

    get full(): boolean {
        this.assertAlive();
        return this.count >= this.capacity;
    }

    get formattedArchetype() {
        this.assertAlive();
        return ArchetypeV2.format(this.archetype);
    }

    getGeneration(row: number): number {
        this.assertAlive();
        if (row < 0 || row >= this.capacity) {
            throw new Error(`Chunk.getGeneration: row ${row} out of bounds`);
        }
        return this.generations[row];
    }

    getView<T extends Buffer>(descriptor: ComponentDescriptor): T {
        this.assertAlive();
        const view = (this.views as any)[descriptor.name] as T;
        if (!view) {
            throw new Error(`View for ${descriptor.name} not found`);
        }
        return view;
    }

    allocate(): { row: number; generation: number } {
        this.assertAlive();

        if (this.count >= this.capacity) {
            throw new Error(
                `[Chunk.allocate]: Chunk is full - maxEntities = ${this.capacity}`
            );
        }

        const row = this.count;

        const generation = this.generations[row];

        this.incrementCount(); // Increment the count in the header

        // let's copy the default values for each component type before returning the row
        for (const type of this.archetype.types) {
            const descriptor = this.archetype.descriptors.get(type);
            if (descriptor === undefined)
                throw new Error(
                    `Chunk.allocate: descriptor for type ${type} not found`
                );

            const view = this.getView<Buffer>(descriptor);

            const elementCount = descriptor.count;
            const defaults = descriptor.default;
            if (defaults.length !== elementCount) {
                throw new Error(
                    `Default values for ${descriptor.name} do not match the count`
                );
            }
            const base = row * elementCount;
            for (let i = 0; i < elementCount; i++) {
                view[base + i] = defaults[i];
            }
        }

        return { row, generation };
    }

    delete(row: number): {
        row: number;
        generation: number;
        movedRow: number | undefined;
    } {
        this.assertAlive();

        if (this.count <= 0) {
            throw new Error(`Chunk.delete: chunk is empty, nothing to delete`);
        }

        const lastRow = this.count - 1;
        if (row < 0 || row >= this.count) {
            throw new Error(`Row ${row} out of bounds, nothing to delete`);
        }

        // now if the row to delete is the last row, just shrink then count and return undefined
        if (row === lastRow) {
            this.generations[row]++;
            this.decrementCount();
            return {
                row: row,
                generation: this.generations[row] - 1,
                movedRow: undefined,
            };
        }

        // copy last row → hole, column by column
        for (const type of this.archetype.types) {
            const d = this.archetype.descriptors.get(type);
            if (d === undefined)
                throw new Error(
                    `Chunk.delete: descriptor for type ${type} not found`
                );

            const view = this.getView<Buffer>(d);

            const elems = d.count;
            const src = lastRow * elems;
            const dst = row * elems;

            view.copyWithin(dst, src, src + elems);
        }

        this.generations[row] = this.generations[lastRow];

        this.generations[lastRow]++;

        this.decrementCount(); // finally shrink count

        return {
            row: row,
            generation: this.generations[row],
            movedRow: lastRow,
        };
    }

    dispose(): void {
        if (this.destroyed) return;

        this.destroyed = true;
        this.header!.setUint32(0, 0, true);
        this.buffer = null;
        this.header = null;

        Object.freeze(this.views);

        if (DEBUG) console.log("[Chunk.dispose]: chunk has been disposed");
    }

    /* _______________ internals _______________ */
    private buildViews(): ComponentViews<S> {
        const map = {} as ComponentViews<S>;

        let offset = ChunkV2.HEADER_BYTE_SIZE; // Start after the header

        // Iterate over the archetype's component types and create views
        for (const type of this.archetype.types) {
            if (offset >= this.buffer!.byteLength) {
                throw new Error(
                    `Buffer overflow: Not enough space for component type ${type}`
                );
            }

            const descriptor = this.archetype.descriptors.get(type);
            if (descriptor === undefined)
                throw new Error(
                    `Chunk.buildViews: descriptor for type ${type} not found`
                );

            const align =
                descriptor.alignment ?? descriptor.buffer.BYTES_PER_ELEMENT;
            offset = (offset + align - 1) & ~(align - 1); // Align offset to the descriptor's alignment

            const view = new descriptor.buffer(
                this.buffer!,
                offset,
                this.capacity * descriptor.count
            );

            (map as any)[descriptor.name] = view;

            offset +=
                this.capacity *
                descriptor.count *
                descriptor.buffer.BYTES_PER_ELEMENT;
        }

        if (offset > this.buffer!.byteLength)
            throw new Error("stride mis-match (buffer too small)"); // final guard

        return map;
    }

    private incrementCount(): void {
        const currentCount = this.count;
        if (currentCount >= this.capacity) {
            throw new Error("Chunk is full");
        }
        this.header!.setUint32(0, currentCount + 1, true); // Increment the count in the header
    }

    private decrementCount(): void {
        const currentCount = this.count;
        if (currentCount === 0) {
            throw new Error("Chunk is empty. count is already 0");
        }
        this.header!.setUint32(0, currentCount - 1, true);
    }

    private assertAlive(): void {
        if (this.destroyed) throw new Error("Chunk has been destroyed");
    }
}
