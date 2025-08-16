/**
 * A sparse-set collection for efficiently mapping numeric IDs to arbitrary metadata.
 * Generic over the metadata type `D`.
 *
 * **Capacity Management:**
 * - Maximum capacity: ~2.1 billion entities (2^31 - 1)
 * - Use `getCapacityStatus()` to monitor usage
 * - Use `migrateToMap()` when approaching limits
 * - Memory usage: ~40-70 bytes per entity
 *
 * **Performance Characteristics:**
 * - Insert/Remove: O(1) amortized
 * - Lookup: O(1)
 * - Iteration: O(n) where n = actual entity count
 *
 * **When to switch data structures:**
 * - < 80% capacity: Safe to continue using SparseSet
 * - 80-95% capacity: Monitor and plan migration
 * - > 95% capacity: Switch to Map or split into multiple SparseSets
 */
export class SparseSet<I extends number, D> {
    /**
     * Maximum capacity based on JavaScript array limits.
     * JavaScript arrays can theoretically hold up to 2^32 - 1 elements.
     * This provides a safe upper bound for practical use.
     */
    static readonly MAX_CAPACITY = 2_147_483_647; // 2^31 - 1 (safe integer limit)

    /** sparse[id] = index into dense & data, or undefined */
    private sparse: (number | undefined)[] = [];
    /** packed array of IDs */
    private dense: I[] = [];
    /** packed array of metadata, aligned with `dense` */
    private data: D[] = [];

    /**
     * returns the readonly array of ids
     */
    get ids(): readonly I[] {
        return this.dense;
    }

    /**
     * Do we have a mapping for this id?
     */
    has(id: I): boolean {
        const idx = this.sparse[id as number];
        return idx !== undefined && this.dense[idx] === id;
    }

    /**
     * Get the metadata for `id`, or undefined if not present.
     */
    get(id: I): D | undefined {
        const idx = this.sparse[id as number];
        if (idx === undefined || this.dense[idx] !== id) return undefined;
        return this.data[idx];
    }

    /**
     * Insert a new (id → value) pair.
     * Throws if `id` already exists or if capacity limit is reached.
     */
    insert(id: I, value: D): void {
        if (this.has(id)) {
            throw new Error(`SparseSet.insert: id ${id} already exists`);
        }

        if (this.size() >= SparseSet.MAX_CAPACITY) {
            throw new Error(
                `SparseSet.insert: Maximum capacity (${SparseSet.MAX_CAPACITY.toLocaleString()}) reached. ` +
                    `Consider using a different data structure like Map or splitting into multiple SparseSets.`
            );
        }

        const idx = this.data.length;
        this.sparse[id as number] = idx;
        this.dense[idx] = id;
        this.data[idx] = value;
    }

    /**
     * Remove a mapping by `id`. Returns true if removed, false if not found.
     * Swaps the removed slot with the last to keep packed.
     */
    remove(id: I): boolean {
        const idx = this.sparse[id as number];
        if (idx === undefined || this.dense[idx] !== id) return false;

        const lastIdx = this.data.length - 1;
        // Move last element into the hole
        this.dense[idx] = this.dense[lastIdx];
        this.data[idx] = this.data[lastIdx];
        this.sparse[this.dense[idx] as number] = idx;

        // Pop off the last slot
        this.dense.pop();
        this.data.pop();
        this.sparse[id as number] = undefined;

        return true;
    }

    /**
     * Number of mappings in the set.
     */
    size(): number {
        return this.data.length;
    }

    /**
     * Check if the set is approaching capacity limits.
     * Returns a warning level: 'safe', 'warning', or 'critical'.
     */
    getCapacityStatus(): {
        level: "safe" | "warning" | "critical";
        percentage: number;
        recommendation?: string;
    } {
        const currentSize = this.size();
        const percentage = (currentSize / SparseSet.MAX_CAPACITY) * 100;

        if (percentage < 80) {
            return { level: "safe", percentage };
        } else if (percentage < 95) {
            return {
                level: "warning",
                percentage,
                recommendation:
                    "Consider monitoring memory usage and planning for data structure migration.",
            };
        } else {
            return {
                level: "critical",
                percentage,
                recommendation:
                    "Switch to Map or split into multiple SparseSets immediately to avoid errors.",
            };
        }
    }

    /**
     * Get memory usage estimate in bytes.
     * This is a rough estimate based on typical JavaScript object sizes.
     */
    getMemoryEstimate(): number {
        const currentSize = this.size();
        // Rough estimates:
        // - sparse array: 4 bytes per potential ID (sparse, so varies)
        // - dense array: 4 bytes per actual ID
        // - data array: varies by metadata size, estimate 64 bytes per entity
        const sparseBytes = this.sparse.length * 4;
        const denseBytes = currentSize * 4;
        const dataBytes = currentSize * 64; // Rough estimate for EntityMeta

        return sparseBytes + denseBytes + dataBytes;
    }

    /**
     * Migrate data to a Map when approaching capacity limits.
     * This is useful for transitioning to a different data structure.
     * Returns a Map with the same data and clears the SparseSet.
     */
    migrateToMap(): Map<I, D> {
        const map = new Map<I, D>();

        // Copy all data to the Map
        for (let i = 0; i < this.data.length; i++) {
            map.set(this.dense[i], this.data[i]);
        }

        // Clear the SparseSet
        this.clear();

        return map;
    }

    /**
     * Remove all mappings.
     */
    clear(): void {
        this.sparse.length = 0;
        this.dense.length = 0;
        this.data.length = 0;
    }

    /**
     * Iterate over each (id, value) pair.
     */
    forEach(fn: (value: D, id: I) => void): void {
        for (let i = 0; i < this.data.length; i++) {
            fn(this.data[i], this.dense[i]);
        }
    }

    /**
     * Find the first value and id matching the predicate.
     * Returns [id, value] or undefined if not found.
     */
    find(predicate: (value: D, id: I) => boolean): [I, D] | undefined {
        for (let i = 0; i < this.data.length; i++) {
            if (predicate(this.data[i], this.dense[i])) {
                return [this.dense[i], this.data[i]];
            }
        }
        return undefined;
    }

    /**
     * Find all (id, value) pairs matching the predicate.
     * Returns an array of [id, value] tuples.
     */
    findAll(predicate: (value: D, id: I) => boolean): [I, D][] {
        const results: [I, D][] = [];
        for (let i = 0; i < this.data.length; i++) {
            if (predicate(this.data[i], this.dense[i])) {
                results.push([this.dense[i], this.data[i]]);
            }
        }
        return results;
    }

    /**
     * Make the set itself iterable: yields [id, value].
     */
    *[Symbol.iterator](): IterableIterator<[I, D]> {
        for (let i = 0; i < this.data.length; i++) {
            yield [this.dense[i], this.data[i]];
        }
    }
}

/**
 * A sparse-set collection for efficiently mapping 64-bit (bigint) IDs to arbitrary metadata.
 * Optimized for large-scale entity management with virtually unlimited capacity.
 *
 * **Capacity Management:**
 * - Maximum capacity: ~2^48 entities (281 trillion entities)
 * - Memory usage: ~80-120 bytes per entity
 * - Use `getCapacityStatus()` to monitor usage
 * - Use `migrateToMap()` when approaching limits
 *
 * **Performance Characteristics:**
 * - Insert/Remove: O(1) amortized
 * - Lookup: O(1)
 * - Iteration: O(n) where n = actual entity count
 *
 * **When to use BigSparseSet vs SparseSet:**
 * - BigSparseSet: 64-bit IDs, massive scale, unlimited generations
 * - SparseSet: 32-bit IDs, smaller scale, limited generations (4)
 */
export class BigSparseSet<I extends bigint, D> {
    /**
     * Maximum capacity based on JavaScript array limits.
     * JavaScript arrays can theoretically hold up to 2^32 - 1 elements.
     * This provides a safe upper bound for practical use.
     */
    static readonly MAX_CAPACITY = 2_147_483_647; // 2^31 - 1 (safe integer limit)

    /** sparse[id] = index into dense & data, or undefined */
    private readonly sparse = new Map<I, number>();
    /** packed array of IDs */
    private dense: I[] = [];
    /** packed array of metadata, aligned with `dense` */
    private data: D[] = [];

    /**
     * returns the readonly array of ids
     */
    get ids(): readonly I[] {
        return this.dense;
    }

    /**
     * Do we have a mapping for this id?
     */
    has(id: I): boolean {
        const idx = this.sparse.get(id);
        return idx !== undefined && this.dense[idx] === id;
    }

    /**
     * Get the metadata for `id`, or undefined if not present.
     */
    get(id: I): D | undefined {
        const idx = this.sparse.get(id);
        if (idx === undefined || this.dense[idx] !== id) return undefined;
        return this.data[idx];
    }

    /**
     * Insert a new (id → value) pair.
     * Throws if `id` already exists or if capacity limit is reached.
     */
    insert(id: I, value: D): void {
        if (this.has(id)) {
            throw new Error(
                `BigSparseSet.insert: id ${id.toString()} already exists`
            );
        }

        if (this.size() >= BigSparseSet.MAX_CAPACITY) {
            throw new Error(
                `BigSparseSet.insert: Maximum capacity (${BigSparseSet.MAX_CAPACITY.toLocaleString()}) reached. ` +
                    `Consider using a different data structure like Map or splitting into multiple BigSparseSets.`
            );
        }

        const idx = this.data.length;
        this.sparse.set(id, idx);
        this.dense[idx] = id;
        this.data[idx] = value;
    }

    /**
     * Remove a mapping by `id`. Returns true if removed, false if not found.
     * Swaps the removed slot with the last to keep packed.
     */
    remove(id: I): boolean {
        const idx = this.sparse.get(id);
        if (idx === undefined || this.dense[idx] !== id) return false;

        const lastIdx = this.data.length - 1;
        // Move last element into the hole
        this.dense[idx] = this.dense[lastIdx];
        this.data[idx] = this.data[lastIdx];
        this.sparse.set(this.dense[idx], idx);

        // Pop off the last slot
        this.dense.pop();
        this.data.pop();
        this.sparse.delete(id);

        return true;
    }

    /**
     * Number of mappings in the set.
     */
    size(): number {
        return this.data.length;
    }

    /**
     * Check if the set is approaching capacity limits.
     * Returns a warning level: 'safe', 'warning', or 'critical'.
     */
    getCapacityStatus(): {
        level: "safe" | "warning" | "critical";
        percentage: number;
        recommendation?: string;
    } {
        const currentSize = this.size();
        const percentage = (currentSize / BigSparseSet.MAX_CAPACITY) * 100;

        if (percentage < 80) {
            return { level: "safe", percentage };
        } else if (percentage < 95) {
            return {
                level: "warning",
                percentage,
                recommendation:
                    "Consider monitoring memory usage and planning for data structure migration.",
            };
        } else {
            return {
                level: "critical",
                percentage,
                recommendation:
                    "Switch to Map or split into multiple BigSparseSets immediately to avoid errors.",
            };
        }
    }

    /**
     * Get memory usage estimate in bytes.
     * This is a rough estimate based on typical JavaScript object sizes.
     */
    getMemoryEstimate(): number {
        const currentSize = this.size();
        // Rough estimates for 64-bit IDs:
        // - sparse Map: ~24 bytes per entry (key + value + overhead)
        // - dense array: 8 bytes per bigint ID
        // - data array: varies by metadata size, estimate 64 bytes per entity
        const sparseBytes = this.sparse.size * 24;
        const denseBytes = currentSize * 8;
        const dataBytes = currentSize * 64; // Rough estimate for EntityMeta

        return sparseBytes + denseBytes + dataBytes;
    }

    /**
     * Migrate data to a Map when approaching capacity limits.
     * This is useful for transitioning to a different data structure.
     * Returns a Map with the same data and clears the BigSparseSet.
     */
    migrateToMap(): Map<I, D> {
        const map = new Map<I, D>();

        // Copy all data to the Map
        for (let i = 0; i < this.data.length; i++) {
            map.set(this.dense[i], this.data[i]);
        }

        // Clear the BigSparseSet
        this.clear();

        return map;
    }

    /**
     * Remove all mappings.
     */
    clear(): void {
        this.sparse.clear();
        this.dense.length = 0;
        this.data.length = 0;
    }

    /**
     * Iterate over each (id, value) pair.
     */
    forEach(fn: (value: D, id: I) => void): void {
        for (let i = 0; i < this.data.length; i++) {
            fn(this.data[i], this.dense[i]);
        }
    }

    /**
     * Find the first value and id matching the predicate.
     * Returns [id, value] or undefined if not found.
     */
    find(predicate: (value: D, id: I) => boolean): [I, D] | undefined {
        for (let i = 0; i < this.data.length; i++) {
            if (predicate(this.data[i], this.dense[i])) {
                return [this.dense[i], this.data[i]];
            }
        }
        return undefined;
    }

    /**
     * Find all (id, value) pairs matching the predicate.
     * Returns an array of [id, value] tuples.
     */
    findAll(predicate: (value: D, id: I) => boolean): [I, D][] {
        const results: [I, D][] = [];
        for (let i = 0; i < this.data.length; i++) {
            if (predicate(this.data[i], this.dense[i])) {
                results.push([this.dense[i], this.data[i]]);
            }
        }
        return results;
    }

    /**
     * Make the set itself iterable: yields [id, value].
     */
    *[Symbol.iterator](): IterableIterator<[I, D]> {
        for (let i = 0; i < this.data.length; i++) {
            yield [this.dense[i], this.data[i]];
        }
    }
}
