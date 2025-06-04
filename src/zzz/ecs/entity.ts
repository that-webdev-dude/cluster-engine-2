/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

import { IDPool } from "../tools/IDPool";
import { Storage } from "./storage";
import { ComponentDescriptor } from "./components";

/**
 * Represents the unique identifier for an entity within the ECS (Entity Component System).
 * Typically used to reference and manage entities in the system.
 */
export type EntityId = number;

/**
 * Metadata associated with an entity in the ECS (Entity Component System).
 *
 * @property storage - The storage container holding an array of component descriptors for the entity.
 * @property entityId - The unique identifier for the entity.
 * @property chunkId - The identifier of the chunk where the entity is stored.
 * @property row - The row index within the chunk where the entity's data resides.
 */
export type EntityMeta = {
    storage: Storage<ComponentDescriptor[]>;
    entityId: EntityId;
    chunkId: number;
    row: number;
};

/**
 * A sparse-set collection for efficiently tracking {@link EntityMeta} objects by their {@link EntityId}.
 * This class provides fast O(1) insertion, lookup, and removal of entities while keeping the underlying data packed for cache efficiency.
 * Internally, it uses a sparse array to map {@link EntityId} values to indices in a packed array of {@link EntityMeta} objects.
 * Typical usage involves inserting, removing, and querying entities by their unique identifier.
 */
export class EntityMetaSet {
    /**
     * A sparse-set collection for tracking EntityMeta objects by their EntityId.
     * Provides fast O(1) insert, lookup, and removal while keeping data packed.
     */
    private sparse: EntityId[] = [];

    /** Packed array of EntityMeta entries */
    private meta: EntityMeta[] = [];

    /**
     * Determines whether the set contains a given EntityId.
     * @param entityId - The unique identifier of the entity.
     * @returns True if present, false otherwise.
     */
    has(entityId: EntityId): boolean {
        const metaIndex = this.sparse[entityId];
        return (
            metaIndex !== undefined &&
            this.meta[metaIndex]?.entityId === entityId
        );
    }

    /**
     * Retrieves the EntityMeta for a given EntityId.
     * @param entityId - The unique identifier of the entity.
     * @returns The associated EntityMeta, or undefined if not found.
     */
    get(entityId: EntityId): EntityMeta | undefined {
        const metaIndex = this.sparse[entityId];
        if (metaIndex === undefined) return;
        const meta = this.meta[metaIndex];
        return meta?.entityId === entityId ? meta : undefined;
    }

    /**
     * Inserts a new EntityMeta into the set.
     * @param meta - The EntityMeta object to insert.
     * @throws If the EntityId is already present.
     */
    insert(meta: EntityMeta): void {
        const entityId = meta.entityId;
        if (this.has(entityId))
            throw new Error(
                `EntityMetaSet.insert: cannot insert. entityId ${entityId} already exists`
            );
        const metaIndex = this.meta.length;
        this.sparse[entityId] = metaIndex;
        this.meta.push(meta);
    }

    /**
     * Removes an EntityMeta by EntityId.
     * Swaps with the last element to keep the internal array packed.
     * @param entityId - The unique identifier of the entity to remove.
     * @returns True if removal succeeded, false if not found.
     */
    remove(entityId: EntityId): boolean {
        const metaIndex = this.sparse[entityId];
        if (metaIndex === undefined) return false;

        const lastMetaIndex = this.meta.length - 1;
        const lastMetaData = this.meta[lastMetaIndex];

        // Swap with the last element to keep meta array packed
        this.meta[metaIndex] = lastMetaData;
        this.sparse[lastMetaData.entityId] = metaIndex;

        this.meta.pop();
        delete this.sparse[entityId];

        return true;
    }

    /**
     * Returns the number of EntityMeta entries in the set.
     */
    size(): number {
        return this.meta.length;
    }

    /**
     * Clears all entries from the set.
     */
    clear() {
        this.sparse.length = 0;
        this.meta.length = 0;
    }

    /**
     * Executes a provided function once for each EntityMeta in the set.
     * @param fn - Callback invoked with each EntityMeta.
     */
    forEach(fn: (meta: EntityMeta) => void) {
        this.meta.forEach(fn);
    }

    /**
     * Iterator over all EntityMeta entries.
     */
    *[Symbol.iterator]() {
        yield* this.meta;
    }
}

/**
 * A global instance of {@link IDPool} used to manage and allocate unique entity IDs
 * within the ECS (Entity Component System) framework.
 */
export const EntityPool = new IDPool();

/**
 * Creates and returns a new entity identifier by acquiring it from the entity pool.
 *
 * @returns {EntityId} The unique identifier for the newly created entity.
 */
export function createEntity(): EntityId {
    return EntityPool.acquire();
}

/**
 * Destroys the entity with the specified `entityId`.
 * This function releases the entity back to the `EntityPool`, making its ID available for reuse.
 *
 * @param entityId - The unique identifier of the entity to destroy.
 */
export function destroyEntity(entityId: EntityId): void {
    EntityPool.release(entityId);
}
