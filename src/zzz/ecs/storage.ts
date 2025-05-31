import { Chunk } from "./chunk";
import { Archetype } from "./archetype";
import { ComponentDescriptor } from "./components";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class Storage<S extends readonly ComponentDescriptor[]> {
    private static nextChunkId = 0;

    private freeChunkIds: number[] = [];

    private entities: Map<number, { chunkId: number; row: number }> = new Map();

    private chunks: Map<number, Chunk<S>> = new Map();

    private partialChunkIds: Set<number> = new Set();

    // TODO
    // Storage<S> can be instantiated with an Archetype whose component list does not match S. TypeScript can’t prove the two are consistent.
    constructor(private readonly archetype: Archetype) {}

    /* _______________ public API _______________ */
    getChunk(chunkId: number): Readonly<Chunk<S>> | undefined {
        return this.chunks.get(chunkId);
    }

    // TODO
    // need to implement a command buffer for deferred structural changes in the chunks (allocate/delete)
    forEachChunk(cb: (chunk: Readonly<Chunk<S>>, id: number) => void): void {
        // ⚠️  DO NOT modify this.chunks inside the callback!
        this.chunks.forEach((chunk, id) => cb(chunk, id));
    }

    allocate(entityId: number): { chunkId: number; row: number } {
        this.validateEntityId(entityId);

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

        const row = chunk.allocate(entityId); // safe as at this point a chunk must exist

        if (row === Chunk.ENTITIES_PER_CHUNK - 1) {
            this.partialChunkIds.delete(chunkId);
        } // the chunk is full so remove it from the partialChunkIds

        const address = { chunkId, row };

        // update the entity address
        this.entities.set(entityId, address);

        if (DEBUG) {
            console.log(
                `Storage.allocate.DEBUG: entityId: ${entityId} chunkId: ${address.chunkId} row: ${address.row}`
            );
        }

        return address;
    }

    delete(entityId: number) {
        this.validateEntityId(entityId);

        if (!this.entities.has(entityId))
            throw new Error(
                `Storage.delete: entityId: ${entityId} not found in the storage, cannot delete!`
            );

        const { chunkId, row } = this.entities.get(entityId)!; // safe due to previous check

        const chunk = this.getChunk(chunkId);
        if (!chunk) return;

        const movedEntityId = chunk.delete(row);

        if (!chunk.full) {
            this.partialChunkIds.add(chunkId);
        }

        // if an entity is been moved to the new location update the address map
        if (movedEntityId !== undefined) {
            this.entities.set(movedEntityId, { chunkId, row });
        }

        // delete the target entity id anyway as it must go
        this.entities.delete(entityId);

        if (chunk.count === 0) {
            this.destroyChunkInstance(chunkId);
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
        const chunkId = this.freeChunkIds.pop() ?? Storage.nextChunkId++;

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
        this.freeChunkIds.push(chunkId);
    }
}
