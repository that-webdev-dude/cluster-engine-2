/**
 * A sparse-set collection for efficiently mapping numeric IDs to arbitrary metadata.
 * Generic over the metadata type `D`.
 */
export class SparseSet<I extends number, D> {
    /** sparse[id] = index into dense & data, or undefined */
    private sparse: number[] = [];
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
     * Throws if `id` already exists.
     */
    insert(id: I, value: D): void {
        if (this.has(id)) {
            throw new Error(`SparseSet.insert: id ${id} already exists`);
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
        delete this.sparse[id as number];

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
    forEach(fn: (value: D, id: I) => void): void {
        for (let i = 0; i < this.data.length; i++) {
            fn(this.data[i], this.dense[i]);
        }
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
