import {
    Buffer,
    ComponentType,
    ComponentDescriptor,
    ComponentValueMap,
} from "../types";
import { Chunk, ChunkV2 } from "./chunk";
import { IDPool } from "../tools/IDPool";
import { Archetype } from "./archetype";

// type ComponentType = number & { __brand: "ComponentType" };

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class Storage<S extends readonly ComponentDescriptor[]> {
    private chunkIdPool: IDPool<number> = new IDPool();

    private entities: Map<number, { chunkId: number; row: number }> = new Map();

    private chunks: Map<number, Chunk<S>> = new Map();

    private liveEntities: number = 0;

    private partialChunkIds: Set<number> = new Set();

    // TODO
    // Storage<S> can be instantiated with an Archetype whose component list does not match S. TypeScript can’t prove the two are consistent.
    constructor(readonly archetype: Archetype) {}

    get entityCount() {
        return this.liveEntities;
    }

    get maxEntities(): Readonly<number> | undefined {
        return this.archetype.maxEntities || undefined;
    }

    /* _______________ public API _______________ */
    getChunk(chunkId: number): Readonly<Chunk<S>> | undefined {
        return this.chunks.get(chunkId);
    }

    /**
     * Iterates all chunks for this Storage.
     * Structural changes (allocate/delete) MUST NOT be made during iteration.
     * Use CommandBuffer to defer operations and call `flushCommands()` after.
     */
    forEachChunk(cb: (chunk: Readonly<Chunk<S>>, id: number) => void): void {
        this.chunks.forEach((chunk, id) => cb(chunk, id)); // ⚠️ DO NOT modify this.chunks inside the callback!
    }

    assign(
        entityId: number,
        comps: ComponentValueMap
    ): { chunkId: number; row: number } | undefined {
        this.validateEntityId(entityId);

        const address = this.entities.get(entityId);
        if (!address) {
            return undefined;
        }

        const { chunkId, row } = address;

        const chunk = this.chunks.get(chunkId);
        if (!chunk) {
            return undefined;
        }

        for (const [typeStr, value] of Object.entries(comps)) {
            const type = Number(typeStr) as ComponentType; // case to a number for getting the ComponentType

            // first check if the actual component is in this archetype
            const descriptor = this.archetype.descriptors.get(type);
            if (descriptor === undefined) {
                if (DEBUG) {
                    console.log(
                        `Storage.assign.DEBUG: illegal assignement - component ${type} is not in the archetype descriptors`
                    );
                }
                continue;
            }

            if (!chunk.views.hasOwnProperty(descriptor.name)) {
                throw new Error(
                    `Storage.assign: view for ${descriptor.name} not found`
                );
            }

            if (!(value instanceof descriptor.buffer)) {
                throw new Error(
                    `Storage.assign: Component ${descriptor.name} expects ${descriptor.buffer.name}`
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

        return address;
    }

    allocate(
        entityId: number,
        comps?: ComponentValueMap | undefined
    ): { chunkId: number; row: number } {
        this.validateEntityId(entityId);

        // check for an entity limit in the archetype before allocate
        if (
            this.archetype.maxEntities &&
            this.liveEntities >= this.archetype.maxEntities
        )
            throw new Error(
                `Storage.allocate: this.storage has a limited number of entities set to ${this.archetype.maxEntities}`
            );

        if (this.entities.has(entityId))
            throw new Error(
                `Storage.allocate: entityId: ${entityId} already exists in the storage. cannot allocate!`
            );

        // finds the first available (non-full) chunk. if no available chunks, need to create a new one
        let chunkId = this.findAvailableChunk();
        if (chunkId === undefined) {
            chunkId = this.createChunk();
            this.partialChunkIds.add(chunkId);
        }

        const chunk = this.getChunk(chunkId)!;

        const row = chunk.allocate(); // safe as at this point a chunk must exist

        if (row === chunk.capacity - 1) {
            this.partialChunkIds.delete(chunkId);
        } // the chunk is full so remove it from the partialChunkIds

        const address = { chunkId, row };

        // update the entity address
        this.entities.set(entityId, address);

        this.liveEntities++;

        // if (DEBUG) {
        //     console.log(
        //         `Storage.allocate.DEBUG: entityId: ${entityId} chunkId: ${address.chunkId} row: ${address.row}`
        //     );
        // }

        // if the user provides comps, assign comps
        if (comps !== undefined) {
            this.assign(entityId, comps);
        }

        return address;
    }

    delete(entityId: number) {
        this.validateEntityId(entityId);

        if (!this.entities.has(entityId)) {
            throw new Error(
                `Storage.delete: entityId: ${entityId} not found in the storage, cannot delete!`
            );
            // return;
        }

        const { chunkId, row } = this.entities.get(entityId)!; // safe due to previous check

        const chunk = this.getChunk(chunkId);
        if (!chunk) return;

        const movedEntityId = chunk.delete(row);

        // if an entity is been moved to the new location update the address map
        if (movedEntityId !== undefined) {
            this.entities.set(movedEntityId, { chunkId, row });
        }

        // delete the target entity id anyway as it must go
        this.entities.delete(entityId);

        this.liveEntities--;

        if (chunk.count === 0) {
            this.destroyChunkInstance(chunkId);
        } else if (!chunk.full) {
            this.partialChunkIds.add(chunkId);
        }
    }

    /* _______________ internals _______________ */
    private validateEntityId(entityId: number) {
        if (entityId < 0)
            throw new Error(
                `Storage.validateEntityId: invalid entityId - must be >= 0`
            );
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
        // consider to add a destroy to Chunk to free memory
        const chunk = this.getChunk(chunkId);
        if (!chunk) return;

        chunk.dispose();

        this.chunks.delete(chunkId);
        this.partialChunkIds.delete(chunkId);
        this.chunkIdPool.release(chunkId);
    }
}

export class StorageV2<S extends readonly ComponentDescriptor[]> {
    private chunks: Map<number, ChunkV2<S>> = new Map();

    private chunkIdPool: IDPool<number> = new IDPool();

    private partialChunkIds: Set<number> = new Set();

    private liveRecords: number = 0;

    // TODO
    /**
     * You can instantiate a StorageV2<S> with an Archetype whose component list doesn’t actually match S. TypeScript can’t verify that the tuple of descriptors S corresponds exactly to archetype.types.
     * Option: make Archetype generic, e.g. Archetype<S> so that create and register carry the same S through to StorageV2<S>.
     * Option: at runtime, in your constructor, assert that archetype.types.length === S.length and that the type identifiers line up, throwing early if they don’t.
     */
    constructor(readonly archetype: Archetype) {}

    get length() {
        return this.liveRecords;
    }

    get isEmpty(): boolean {
        for (const chunk of this.chunks.values()) {
            if (chunk.count > 0) return false;
        }
        return true;
    }

    getChunk(chunkId: number): Readonly<ChunkV2<S>> | undefined {
        return this.chunks.get(chunkId);
    }

    /**
     * Iterates all chunks for this Storage.
     * Structural changes (allocate/delete) MUST NOT be made during iteration.
     * Use CommandBuffer to defer operations and call `flushCommands()` after.
     */
    forEachChunk(
        cb: (chunk: Readonly<ChunkV2<S>>, chunkId: number) => void
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
        row: number
    ): {
        chunkId: number;
        row: number;
        generation: number;
        movedRow: number | undefined;
    } {
        const chunk = this.getChunk(chunkId);
        if (!chunk) {
            throw new Error(
                `Storage.delete: illegal attempt to delete - the chunkId ${chunkId} doesn't exists`
            );
        }

        const meta = chunk.delete(row);

        this.liveRecords--;

        if (chunk.count === 0) {
            this.destroyChunkInstance(chunkId);
        } else if (!chunk.full) {
            this.partialChunkIds.add(chunkId);
        }

        return { chunkId, ...meta };
    }

    private findAvailableChunk(): number | undefined {
        return this.partialChunkIds.values().next().value as number | undefined;
    }

    private createChunk(): number {
        // const chunkId = this.freeChunkIds.pop() ?? Storage.nextChunkId++;
        const chunkId = this.chunkIdPool.acquire();

        this.chunks.set(chunkId, new ChunkV2<S>(this.archetype));

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

/**
 * the worlds deletes the entity 5 living in chunk 1, row 20
 * when deleted we get back
 *  chunkid 1,
 *  row 20
 *  movedRow: 33 → this is now occupying the chunkid 1 - row 20
 *
 * this means that whichever entity id has metadata chunkid 1 - row 33,
 * now needs to update the metadata to chunkid 1 - row 20
 */
