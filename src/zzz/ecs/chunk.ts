// src/ecs/chunk.ts

import { BufferInstance } from "./buffer";
import { Archetype } from "./archetype";
import { ComponentType, ComponentDescriptor, DESCRIPTORS } from "./components";

type ComponentViews<D extends readonly ComponentDescriptor[]> = {
    [K in D[number] as K["name"]]: InstanceType<K["buffer"]>;
};

class Chunk<S extends readonly ComponentDescriptor[]> {
    static readonly ENTITIES_PER_CHUNK = 256; // entities per chunk

    static readonly HEADER_BYTE_SIZE = 32; // size of the header in bytes, can be used for metadata

    private readonly buffer: ArrayBuffer;

    readonly views: ComponentViews<S>;

    readonly header: DataView; // can be used for metadata, e.g., chunk ID, version, etc.

    constructor(private readonly archetype: Archetype) {
        const payloadBytes = Chunk.ENTITIES_PER_CHUNK * archetype.byteStride;

        this.buffer = new ArrayBuffer(Chunk.HEADER_BYTE_SIZE + payloadBytes);

        this.header = new DataView(this.buffer, 0, Chunk.HEADER_BYTE_SIZE); // Initialize the header

        this.header.setUint32(0, 0, true); // Initialize count to 0

        this.views = this.buildViews();
    }

    /* _______________ public API _______________ */
    get capacity(): number {
        return Chunk.ENTITIES_PER_CHUNK;
    }

    get byteSize(): number {
        return (
            Chunk.HEADER_BYTE_SIZE +
            Chunk.ENTITIES_PER_CHUNK * this.archetype.byteStride
        );
    }

    // get the count directly from the header
    get count(): number {
        return this.header.getUint32(0, true); // Assuming the count is stored at the start of the header
    }

    // Handy for debug prints or quick look-ups
    get entityIdColumn(): Uint32Array {
        return this.getView<Uint32Array>(DESCRIPTORS[ComponentType.EntityId]);
    }

    getView<T extends BufferInstance>(descriptor: ComponentDescriptor): T {
        const view = (this.views as any)[descriptor.name] as T;
        if (!view) {
            throw new Error(`View for ${descriptor.name} not found`);
        }
        return view;
    }

    // should return the first free slot in the chunk
    allocate(entityId: number): number {
        if (this.count >= Chunk.ENTITIES_PER_CHUNK) {
            throw new Error("Chunk is full");
        }

        const row = this.count;

        this.incrementCount(); // Increment the count in the header

        // let's copy the default values for each component type before returning the row
        for (const type of this.archetype.types) {
            const descriptor = DESCRIPTORS[type];
            const view = this.getView<BufferInstance>(descriptor);

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

        // overwrite the entity ID in the EntityId component
        const idView = this.getView<Uint32Array>(
            DESCRIPTORS[ComponentType.EntityId]
        );
        idView[row] = entityId;

        return row;
    }

    delete(row: number): void {
        const lastRow = this.count - 1;
        if (row < 0 || row >= this.count) throw new Error("row out of bounds");

        if (row !== lastRow) {
            // copy last row → hole, column by column
            for (const type of this.archetype.types) {
                const d = DESCRIPTORS[type];
                const view = this.getView<BufferInstance>(d);

                const elems = d.count;
                const src = lastRow * elems;
                const dst = row * elems;

                // fast path: TypedArray.set(view.subarray(...))
                view.copyWithin(dst, src, src + elems);
            }
            // update the world-side entity-lookup table *outside* the chunk
            // (world must swap the moved entity's row index)
            console.warn(
                `Moved entity from row ${lastRow} to ${row} in chunk. you must update the world-side entity-lookup table!`
            );
        }

        // finally shrink count
        this.header.setUint32(0, lastRow, true);
    }

    /* _______________ internals _______________ */
    private buildViews(): ComponentViews<S> {
        const map = {} as ComponentViews<S>;

        let offset = Chunk.HEADER_BYTE_SIZE; // Start after the header

        // Iterate over the archetype's component types and create views
        for (const type of this.archetype.types) {
            if (offset >= this.buffer.byteLength) {
                throw new Error(
                    `Buffer overflow: Not enough space for component type ${type}`
                );
            }

            const descriptor = DESCRIPTORS[type];

            const align =
                descriptor.alignment ?? descriptor.buffer.BYTES_PER_ELEMENT;
            offset = (offset + align - 1) & ~(align - 1); // Align offset to the descriptor's alignment

            const view = new descriptor.buffer(
                this.buffer,
                offset,
                Chunk.ENTITIES_PER_CHUNK * descriptor.count
            );

            (map as any)[descriptor.name] = view;

            offset +=
                Chunk.ENTITIES_PER_CHUNK *
                descriptor.count *
                descriptor.buffer.BYTES_PER_ELEMENT;
        }

        if (offset > this.buffer.byteLength)
            throw new Error("stride mis-match (buffer too small)"); // final guard

        return map;
    }

    private incrementCount(): void {
        const currentCount = this.count;
        if (currentCount >= Chunk.ENTITIES_PER_CHUNK) {
            throw new Error("Chunk is full");
        }
        this.header.setUint32(0, currentCount + 1, true); // Increment the count in the header
    }
}

export { Chunk };
