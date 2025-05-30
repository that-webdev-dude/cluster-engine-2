import { Chunk } from "./chunk";
import { Archetype } from "./archetype";
import { ComponentDescriptor } from "./components";

export class Storage<S extends readonly ComponentDescriptor[]> {
    private static nextChunkId = 0;

    private freeChunkIds: number[] = [];

    private entities: Map<number, { chunkId: number; row: number }> = new Map();

    private chunks: Map<number, Chunk<S>> = new Map();

    constructor(private readonly archetype: Archetype) {}

    allocate(entityId: number): { chunkId: number; row: number } {
        this.validateEntityId(entityId);

        if (this.entities.has(entityId))
            throw new Error(
                `Storage.allocate: entityId: ${entityId} already exists in the storage. cannot allocate!`
            );

        // finds the first available (non-full) chunk
        // if no available chunks, need to create a new one
        let chunkId = this.findAvailableChunk();
        if (chunkId === undefined) {
            chunkId = this.createChunk();
        }

        const row = this.chunks.get(chunkId)!.allocate(entityId); // safe as at this point a chunk must exist

        const address = { chunkId, row };

        // update the entity address
        this.entities.set(entityId, address);

        console.log(
            `entityId: ${entityId} chunkId: ${address.chunkId} row: ${address.row}`
        );

        return address;
    }

    delete(entityId: number) {
        this.validateEntityId(entityId);

        if (!this.entities.has(entityId))
            throw new Error(
                `Storage.delete: entityId: ${entityId} not found in the storage, cannot delete!`
            );

        const { chunkId, row } = this.entities.get(entityId)!; // safe due to previous check

        const movedEntityId = this.chunks.get(chunkId)?.delete(row);

        // if an entity is been moved to the new location update the address map
        if (movedEntityId !== undefined) {
            this.entities.set(movedEntityId, { chunkId, row });
        }

        // delete the target entity id anyway as it must go
        this.entities.delete(entityId);
    }

    private validateEntityId(entityId: number) {
        if (entityId < 0)
            throw new Error(
                `Storage.validateEntityId: invalid entityId - must be a positive integer`
            );
    }

    private findAvailableChunk(): number | undefined {
        let chunkId = [...this.chunks.keys()].find((k) => {
            const c = this.chunks.get(k);
            return c !== undefined && !c.full;
        });

        return chunkId;
    }

    private createChunk(): number {
        const chunkId = this.freeChunkIds.pop() ?? Storage.nextChunkId++;

        this.chunks.set(chunkId, new Chunk<S>(this.archetype));

        return chunkId;
    }

    private deleteChunk() {
        // consider to add a destroy to Chunk to free memory
    }
}
