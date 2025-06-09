/**
 * A sparse-set collection for efficiently mapping numeric IDs to arbitrary metadata.
 * Generic over the metadata type `D`.
 */
export class SparseSet<D> {
    /** sparse[id] = index into dense & data, or undefined */
    private sparse: number[] = [];
    /** packed array of IDs */
    private dense: number[] = [];
    /** packed array of metadata, aligned with `dense` */
    private data: D[] = [];

    /**
     * Do we have a mapping for this id?
     */
    has(id: number): boolean {
        const idx = this.sparse[id];
        return idx !== undefined && this.dense[idx] === id;
    }

    /**
     * Get the metadata for `id`, or undefined if not present.
     */
    get(id: number): D | undefined {
        const idx = this.sparse[id];
        if (idx === undefined || this.dense[idx] !== id) return undefined;
        return this.data[idx];
    }

    /**
     * Insert a new (id → value) pair.
     * Throws if `id` already exists.
     */
    insert(id: number, value: D): void {
        if (this.has(id)) {
            throw new Error(`SparseSet.insert: id ${id} already exists`);
        }
        const idx = this.data.length;
        this.sparse[id] = idx;
        this.dense[idx] = id;
        this.data[idx] = value;
    }

    /**
     * Remove a mapping by `id`. Returns true if removed, false if not found.
     * Swaps the removed slot with the last to keep packed.
     */
    remove(id: number): boolean {
        const idx = this.sparse[id];
        if (idx === undefined || this.dense[idx] !== id) return false;

        const lastIdx = this.data.length - 1;
        // Move last element into the hole
        this.dense[idx] = this.dense[lastIdx];
        this.data[idx] = this.data[lastIdx];
        this.sparse[this.dense[idx]] = idx;

        // Pop off the last slot
        this.dense.pop();
        this.data.pop();
        delete this.sparse[id];

        return true;
    }

    /**
     * Number of mappings in the set.
     */
    size(): number {
        return this.data.length;
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
    forEach(fn: (value: D, id: number) => void): void {
        for (let i = 0; i < this.data.length; i++) {
            fn(this.data[i], this.dense[i]);
        }
    }

    /**
     * Make the set itself iterable: yields [id, value].
     */
    *[Symbol.iterator](): IterableIterator<[number, D]> {
        for (let i = 0; i < this.data.length; i++) {
            yield [this.dense[i], this.data[i]];
        }
    }
}
