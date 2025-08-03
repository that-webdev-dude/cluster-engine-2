import {
    Buffer,
    ComponentType,
    ComponentDescriptor,
    ComponentValueMap,
} from "../types";
import { Chunk } from "./chunk";
import { IDPool } from "../tools/IDPool";
import { Archetype } from "./archetype";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class Storage<S extends readonly ComponentDescriptor[]> {
    private chunks: Map<number, Chunk<S>> = new Map();

    private chunkIdPool: IDPool<number> = new IDPool();

    private partialChunkIds: Set<number> = new Set();

    private liveRecords: number = 0;

    constructor(readonly archetype: Archetype<S>) {}

    get length() {
        return this.liveRecords;
    }

    get isEmpty(): boolean {
        for (const chunk of this.chunks.values()) {
            if (chunk.count > 0) return false;
        }
        return true;
    }

    getChunk(chunkId: number): Readonly<Chunk<S>> | undefined {
        return this.chunks.get(chunkId);
    }

    /**
     * Iterates all chunks for this Storage.
     * Structural changes (allocate/delete) MUST NOT be made during iteration.
     * Use CommandBuffer to defer operations and call `flushCommands()` after.
     */
    forEachChunk(
        cb: (chunk: Readonly<Chunk<S>>, chunkId: number) => void
    ): void {
        this.chunks.forEach((chunk, chunkId) => cb(chunk, chunkId)); // ⚠️ DO NOT modify this.chunks inside the callback!
    }

    allocate(comps?: ComponentValueMap): {
        chunkId: number;
        row: number;
        generation: number;
    } {
        // check for an entity limit in the archetype before allocate
        if (
            this.archetype.maxEntities &&
            this.liveRecords >= this.archetype.maxEntities
        )
            throw new Error(
                `Storage.allocate: this.storage has a limited number of entities set to ${this.archetype.maxEntities}`
            );

        // finds the first available (non-full) chunk. if no available chunks, need to create a new one
        let chunkId = this.findAvailableChunk();
        if (chunkId === undefined) {
            chunkId = this.createChunk();
            this.partialChunkIds.add(chunkId);
        }

        const chunk = this.getChunk(chunkId)!;

        // safe as at this point a chunk must exist
        const { row, generation } = chunk.allocate();

        if (row === chunk.capacity - 1) {
            // the chunk is full so remove it from the partialChunkIds
            this.partialChunkIds.delete(chunkId);
        }

        this.liveRecords++;

        if (comps !== undefined) {
            this.assign(chunkId, row, comps);
        }

        return { chunkId, row, generation };
    }

    assign(
        chunkId: number,
        row: number,
        comps: ComponentValueMap
    ): { chunkId: number; row: number } {
        const chunk = this.chunks.get(chunkId);
        if (!chunk) {
            throw new Error(
                `Storage.assign: illegal assignement - the chunkId ${chunkId} doesn't exists`
            );
        }

        for (const [typeStr, value] of Object.entries(comps)) {
            const type = Number(typeStr) as ComponentType; // case to a number for getting the ComponentType

            // first check if the actual component is in this archetype
            const descriptor = this.archetype.descriptors.get(type);
            if (descriptor === undefined) {
                throw new Error(
                    `Storage.assign.DEBUG: illegal assignement - component ${type} is not in the archetype descriptors`
                );
            }

            const view = chunk.getView<Buffer>(descriptor);
            // now check if the component values has the same length of the descriptor
            const count = descriptor.count;
            if (value?.length !== count) {
                throw new Error(
                    `Storage.assign: illegal assignement - component value must be an array of length ${count}. user value: ${value}`
                );
            }

            // copy the values now
            const base = row * count;
            for (let i = 0; i < count; i++) {
                view[base + i] = value[i];
            }
        }

        return { chunkId, row };
    }

    delete(
        chunkId: number,
        row: number,
        generation: number
    ):
        | {
              chunkId: number;
              row: number;
              generation: number;
              movedRow: number | undefined;
          }
        | undefined {
        const chunk = this.getChunk(chunkId);
        if (!chunk) {
            throw new Error(
                `Storage.delete: illegal attempt to delete - the chunkId ${chunkId} doesn't exists`
            );
        }

        // if the chunk is already empty return undefined
        if (chunk && chunk.count === 0) {
            console.warn(`Storage.delete: the chunk is already empty !!!!`);
            return undefined;
        }

        if (chunk.getGeneration(row) !== generation) return undefined;

        const meta = chunk.delete(row);

        this.liveRecords--;

        if (chunk.count < 0)
            console.warn(`Storage.delete: the chunk has a count < 0 !!!!`);

        // if (chunk.count === 0) {
        //     this.destroyChunkInstance(chunkId);
        // } else if (!chunk.full) {
        //     this.partialChunkIds.add(chunkId);
        // }

        if (!chunk.full) {
            this.partialChunkIds.add(chunkId);
        }

        return { chunkId, ...meta };
    }

    clear(): void {
        for (const [chunkId, chunk] of this.chunks.entries()) {
            chunk.dispose(); // free any associated memory/resources
            this.chunkIdPool.release(chunkId); // make the ID reusable
        }

        this.chunks.clear(); // remove all chunk entries
        this.partialChunkIds.clear(); // reset partial tracking
        this.liveRecords = 0; // reset record count
    }

    private findAvailableChunk(): number | undefined {
        return this.partialChunkIds.values().next().value as number | undefined;
    }

    private createChunk(): number {
        // const chunkId = this.freeChunkIds.pop() ?? Storage.nextChunkId++;
        const chunkId = this.chunkIdPool.acquire();

        this.chunks.set(chunkId, new Chunk<S>(this.archetype));

        return chunkId;
    }

    private destroyChunkInstance(chunkId: number) {
        const chunk = this.getChunk(chunkId);
        if (!chunk) {
            throw new Error(
                `Storage.destroyChunkInstance: illegal attempt to destroy - the chunkId ${chunkId} doesn't exists`
            );
        }

        chunk.dispose();

        this.partialChunkIds.delete(chunkId);
        this.chunkIdPool.release(chunkId);
        this.chunks.delete(chunkId);
    }
}
