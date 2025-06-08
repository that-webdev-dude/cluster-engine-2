import { BufferInstance } from "./buffer";
import { Archetype } from "./archetypeV2";
import { ComponentDescriptor, ComponentType, DESCRIPTORS } from "./components";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

type ComponentViews<D extends readonly ComponentDescriptor[]> = {
    [K in D[number] as K["name"]]: InstanceType<K["buffer"]>;
};

type MovedEntityId = number & { __brand: "MovedEntityId" }; // used in the delete method

export class Chunk<S extends readonly ComponentDescriptor[]> {
    static readonly ENTITIES_PER_CHUNK = 256 * 2; // entities per chunk

    static readonly HEADER_BYTE_SIZE = 32; // size of the header in bytes, can be used for metadata

    private buffer: ArrayBuffer | null;

    private header: DataView | null; // can be used for metadata, e.g., chunk ID, version, etc.

    private destroyed: boolean = false;

    readonly views: ComponentViews<S>;

    constructor(private readonly archetype: Archetype) {
        const payloadBytes = Chunk.ENTITIES_PER_CHUNK * archetype.byteStride;

        this.buffer = new ArrayBuffer(Chunk.HEADER_BYTE_SIZE + payloadBytes);

        this.header = new DataView(this.buffer, 0, Chunk.HEADER_BYTE_SIZE); // Initialize the header

        this.header.setUint32(0, 0, true); // Initialize count to 0

        this.views = this.buildViews();

        Object.freeze(this.views);
    }

    /* _______________ public API _______________ */
    get capacity(): number {
        this.assertAlive();
        return Chunk.ENTITIES_PER_CHUNK;
    }

    get byteSize(): number {
        this.assertAlive();
        return (
            Chunk.HEADER_BYTE_SIZE +
            Chunk.ENTITIES_PER_CHUNK * this.archetype.byteStride
        );
    }

    get count(): number {
        this.assertAlive();
        return this.header ? this.header.getUint32(0, true) : 0; // Assuming the count is stored at the start of the header
    }

    get full(): boolean {
        this.assertAlive();
        return this.count >= Chunk.ENTITIES_PER_CHUNK;
    }

    get entityIdView(): Uint32Array {
        this.assertAlive();
        return this.getView<Uint32Array>(DESCRIPTORS[ComponentType.EntityId]);
    }

    getView<T extends BufferInstance>(descriptor: ComponentDescriptor): T {
        this.assertAlive();
        const view = (this.views as any)[descriptor.name] as T;
        if (!view) {
            throw new Error(`View for ${descriptor.name} not found`);
        }
        return view;
    }

    // should return the first free slot in the chunk
    allocate(entityId: number): number {
        this.assertAlive();

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

    // this version of delete should return the movedEntityId
    delete(row: number): MovedEntityId | undefined {
        this.assertAlive();

        if (this.count <= 0) {
            if (DEBUG) console.warn("Chunk is empty, nothing to delete");
            return undefined; // Nothing to delete
        }

        const lastRow = this.count - 1;
        if (row < 0 || row >= this.count) {
            if (DEBUG)
                console.warn(`Row ${row} out of bounds, nothing to delete`);
            return undefined; // Row out of bounds, nothing to delete
        }

        // now if the row to delete is the last row, just shrink then count and return undefined
        if (row === lastRow) {
            this.decrementCount();
            return undefined;
        }

        const movedEntityId = this.entityIdView[lastRow];

        if (row !== lastRow) {
            // copy last row → hole, column by column
            for (const type of this.archetype.types) {
                const d = DESCRIPTORS[type];
                const view = this.getView<BufferInstance>(d);

                const elems = d.count;
                const src = lastRow * elems;
                const dst = row * elems;

                view.copyWithin(dst, src, src + elems);
            }
            // update the world-side entity-lookup table *outside* the chunk - world must swap the moved entity's row index)
            if (DEBUG)
                console.warn(
                    `Moved entity from row ${lastRow} to row ${row} in chunk. you must update the world-side entity-lookup table!`
                );
        }

        // finally shrink count
        this.decrementCount();

        return movedEntityId as MovedEntityId; // Return the moved entity ID or undefined if no entity was moved
    }

    dispose(): void {
        if (this.destroyed) return;

        this.destroyed = true;

        this.header!.setUint32(0, 0, true);

        this.buffer = null;
        this.header = null;

        if (DEBUG) {
            for (const key in this.views) {
                (this.views as any)[key] = null;
            }
        }

        Object.freeze(this.views);

        if (DEBUG) console.log("chunk has been disposed");
    }

    /* _______________ internals _______________ */
    private buildViews(): ComponentViews<S> {
        const map = {} as ComponentViews<S>;

        let offset = Chunk.HEADER_BYTE_SIZE; // Start after the header

        // Iterate over the archetype's component types and create views
        for (const type of this.archetype.types) {
            if (offset >= this.buffer!.byteLength) {
                throw new Error(
                    `Buffer overflow: Not enough space for component type ${type}`
                );
            }

            const descriptor = DESCRIPTORS[type];

            const align =
                descriptor.alignment ?? descriptor.buffer.BYTES_PER_ELEMENT;
            offset = (offset + align - 1) & ~(align - 1); // Align offset to the descriptor's alignment

            const view = new descriptor.buffer(
                this.buffer!,
                offset,
                Chunk.ENTITIES_PER_CHUNK * descriptor.count
            );

            (map as any)[descriptor.name] = view;

            offset +=
                Chunk.ENTITIES_PER_CHUNK *
                descriptor.count *
                descriptor.buffer.BYTES_PER_ELEMENT;
        }

        if (offset > this.buffer!.byteLength)
            throw new Error("stride mis-match (buffer too small)"); // final guard

        return map;
    }

    private incrementCount(): void {
        const currentCount = this.count;
        if (currentCount >= Chunk.ENTITIES_PER_CHUNK) {
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
