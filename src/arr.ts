import { Schema } from "./cluster/ecs/Schema";

type NumericArray =
    | Float32Array
    | Float64Array
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array;

type NumericArrayConstructor =
    | Float32ArrayConstructor
    | Float64ArrayConstructor
    | Int8ArrayConstructor
    | Uint8ArrayConstructor
    | Uint8ClampedArrayConstructor
    | Int16ArrayConstructor
    | Uint16ArrayConstructor
    | Int32ArrayConstructor
    | Uint32ArrayConstructor;

const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

const SMALL_SWAP_COUNT = 4;

const SCRATCH_POOL = new Map<NumericArrayConstructor, NumericArray>();

function getScratchBuffer<T extends NumericArray>(
    ctor: NumericArrayConstructor,
    size: number
): T {
    let buf = SCRATCH_POOL.get(ctor) as T | undefined;
    if (!buf || buf.length < size) {
        buf = new ctor(size) as T;
        SCRATCH_POOL.set(ctor, buf);
    }
    return buf;
}

function swapElements<T extends NumericArray>(arr: T, i: number, j: number) {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

/**
 * Swaps elements in a numeric TypedArray in place.
 * @param arr The array to swap elements in
 * @param i The first index to swap
 * @param j The second index to swap
 * @param count The number of elements to swap
 * @returns void
 * @throws Error if the indices are out of bounds or if the count is less than 1
 */
function swapNumericArray<T extends NumericArray>(
    arr: T,
    i: number,
    j: number,
    count = 1
) {
    // 1) integer & bounds checks
    for (const v of [i, j, count]) {
        if (!Number.isInteger(v))
            throw new Error(
                "[swapNumericArray] - Indices/count must be integers"
            );
    }
    if (count < 1) throw new Error("[swapNumericArray] - `count` must be ≥ 1");
    if (i < 0 || j < 0 || i + count > arr.length || j + count > arr.length) {
        throw new Error("[swapNumericArray] - Index or subarray out of bounds");
    }

    // 2) no-op if same
    if (i === j) return;

    // 3) normalize
    if (i > j) [i, j] = [j, i];

    // 4) no overlap
    if (j - i < count) {
        throw new Error(
            "[swapNumericArray] - Subarrays overlap; increase count or change indices"
        );
    }

    // 5) small swap fast‐path
    // For small counts, per-element swaps avoid scratch buffer overhead; larger counts use bulk copy for efficiency
    if (count <= SMALL_SWAP_COUNT) {
        for (let k = 0; k < count; k++) {
            swapElements(arr, i + k, j + k);
        }
        return;
    }

    // 6) bulk swap via scratch of same type
    const ctor = arr.constructor as NumericArrayConstructor;
    const scratch = getScratchBuffer<T>(ctor, count);
    const slice = scratch.subarray(0, count);
    slice.set(arr.subarray(i, i + count));
    arr.copyWithin(i, j, j + count);
    arr.set(slice, j);
}

// /**
//  * DataBuffer<T> manages a pool of fixed-size records in a TypedArray for high-performance storage and retrieval.
//  *
//  * Features:
//  * - O(1) add, fastRemove, setActiveRecord, unsetActiveRecord via swap-pop to keep records packed.
//  * - Separates records into an 'active' prefix and 'inactive' suffix for quick filtering.
//  * - Uses numeric IDs to index records; keep in mind insertion order is not preserved.
//  * - Methods returning TypedArray views are read-only; call .slice() for an independent copy.
//  *
//  * Use CLUSTER_ENGINE_DEBUG=true to enable runtime invariant checks (length, capacity, ID maps).
//  *
//  * @template T TypedArray type (e.g., Float32Array).
//  * @param dataType TypedArray constructor to use.
//  * @param capacity Initial number of records.
//  * @param stride Elements per record (must be ≥1).
//  */
// class DataBuffer<T extends NumericArray> {
//     private _bufferCtor: NumericArrayConstructor;
//     private _buffer: T;
//     private _length = 0;
//     private _active = 0;
//     private _capacity: number;
//     private _stride: number;

//     // since every record has a recodrId, we doo bookkeeping to keep track of the recodr ids
//     // locations of the records in the buffer
//     private _indexToIds: Map<number, number>;
//     private _idsToIndex: Map<number, number>;

//     /** DataBuffer is a wrapper around a TypedArray
//      * it's a partitioned buffer that allows to add, remove and view records
//      * and flag them as "active".
//      * the active records live in the first part of the buffer
//      * and the inactive records live in the second part of the buffer
//      *
//      * NOTE: fastRemove, setActiveRecord, and unsetActiveRecord swap elements to keep the buffer packed.
//      *       Consequently, insertion order is not preserved and iteration order (entries/activeEntries) is unstable.
//      * @param dataType - the TypedArray constructor to use
//      * @param capacity - the initial capacity of the buffer
//      * @param stride - the number of elements per record
//      * @note Stride must be ≥ 1 by design; using stride=0 for a scalar buffer would require special-case offset handling and is not supported.
//      */
//     constructor(
//         dataType: NumericArrayConstructor,
//         capacity: number = 0,
//         stride: number = 1
//     ) {
//         if (capacity < 0 || stride < 1) {
//             throw new Error(
//                 "[DataBuffer] - capacity must be ≥ 0 and stride must be ≥ 1"
//             );
//         }
//         this._bufferCtor = dataType;
//         this._capacity = capacity;
//         this._stride = stride;
//         this._buffer = new dataType(capacity * stride) as T;
//         this._indexToIds = new Map<number, number>();
//         this._idsToIndex = new Map<number, number>();
//     }

//     /** index → absolute offset */
//     private recordOffset(index: number): number {
//         return index * this._stride;
//     }

//     /** check that id is a valid integer */
//     private validateId(id: number): void {
//         if (!Number.isInteger(id) || id < 0) {
//             throw new Error(`[DataBuffer] - Invalid id ${id}`);
//         }
//     }

//     /** check that `data` is the right TypedArray and length */
//     private validateData(data: T): void {
//         if (data.constructor !== this._buffer.constructor) {
//             throw new Error(
//                 `[DataBuffer] - Data type ${data.constructor.name} does not match buffer type ${this._buffer.constructor.name}`
//             );
//         }
//         if (data.length !== this._stride) {
//             throw new Error(
//                 `[DataBuffer] - Data length ${data.length} does not match stride ${this._stride}`
//             );
//         }
//     }

//     /** Validates that an index is within [0, length). Throws otherwise. */
//     private validateIndex(index: number): void {
//         if (!Number.isInteger(index) || index < 0 || index >= this._length) {
//             throw new Error(`[DataBuffer] - Index out of bounds: ${index}`);
//         }
//     }

//     /** Retrieves the buffer index for a given record id. Throws if not found. */
//     private getIndexFromId(id: number): number {
//         const idx = this._idsToIndex.get(id);
//         if (
//             idx === undefined ||
//             !Number.isInteger(idx) ||
//             idx < 0 ||
//             idx >= this._length ||
//             this._indexToIds.get(idx) !== id
//         ) {
//             throw new Error(`[DataBuffer] - No record with id ${id}`);
//         }
//         return idx;
//     }

//     /** Runs internal invariant checks. Only enabled in debug/development mode. */
//     private assertConsistency(): void {
//         if (this._length > this._capacity) {
//             throw new Error(
//                 `[DataBuffer] - Invariant violation: length ${this._length} > capacity ${this._capacity}`
//             );
//         }
//         if (this._active > this._length) {
//             throw new Error(
//                 `[DataBuffer] - Invariant violation: active ${this._active} > length ${this._length}`
//             );
//         }
//         if (this._indexToIds.size !== this._length) {
//             throw new Error(
//                 `[DataBuffer] - Invariant violation: indexToIds.size ${this._indexToIds.size} != length ${this._length}`
//             );
//         }
//         if (this._idsToIndex.size !== this._length) {
//             throw new Error(
//                 `[DataBuffer] - Invariant violation: idsToIndex.size ${this._idsToIndex.size} != length ${this._length}`
//             );
//         }
//         for (const [id, idx] of this._idsToIndex) {
//             const mapped = this._indexToIds.get(idx);
//             if (mapped !== id) {
//                 throw new Error(
//                     `[DataBuffer] - Invariant violation: mismatch at index ${idx}, expected id ${id}, found ${mapped}`
//                 );
//             }
//         }
//     }

//     /**
//      * Adds a new record with the given id and data.
//      * Grows the buffer dynamically if needed (capacity ↑). Calls cb(id, data) after add.
//      * O(1) average time via swap-pop when inactive slots exist.
//      * @param id Unique integer id for the record.
//      * @param data TypedArray of length `stride` containing the record.
//      * @param cb Optional callback invoked after insertion.
//      */
//     addRecord(
//         id: number,
//         data: T,
//         cb: (id: number, data: T) => void = () => {}
//     ) {
//         this.validateId(id);
//         this.validateData(data);
//         if (this._length >= this._capacity) {
//             const newCap = this._capacity === 0 ? 1 : this._capacity * 2;
//             this.resize(newCap);
//         }
//         // optional: prevent duplicate IDs
//         if (this._idsToIndex.get(id) !== undefined) {
//             throw new Error(
//                 `[DataBuffer] - Record with id ${id} already exists`
//             );
//         }

//         // Case 1: no inactive slots → just append at the tail
//         if (this._length === this._active) {
//             const idx = this._length;
//             this._buffer.set(data, this.recordOffset(idx));
//             this._indexToIds.set(idx, id);
//             this._idsToIndex.set(id, idx);
//             this._length++;
//             this._active++;

//             // assert that the new record is at the end of the active records
//             if (DEBUG) this.assertConsistency();

//             // 6) call the callback with the new id and data
//             cb(id, data);
//             return;
//         }

//         // Case 2: there *is* an inactive record at `active`
//         const targetIdx = this._active;
//         const freeIdx = this._length;

//         // 1) remember the ID that’s currently at targetIdx
//         const displacedId = this._indexToIds.get(targetIdx);
//         if (displacedId === undefined) {
//             throw new Error(`[DataBuffer] - No record with id ${targetIdx}`);
//         }

//         // 2) swap its data with the first free slot at `length`
//         swapNumericArray(
//             this._buffer,
//             this.recordOffset(targetIdx),
//             this.recordOffset(freeIdx),
//             this._stride
//         );

//         // 3) write the new record into the now-vacated `targetIdx`
//         this._buffer.set(data, this.recordOffset(targetIdx));

//         // 4) update mappings for the **new** record
//         this._indexToIds.set(targetIdx, id);
//         this._idsToIndex.set(id, targetIdx);

//         // 5) update mappings for the **displaced** record
//         this._indexToIds.set(freeIdx, displacedId);
//         this._idsToIndex.set(displacedId, freeIdx);

//         this._active++;
//         this._length++;

//         if (DEBUG) this.assertConsistency();

//         // 6) call the callback with the new id and data
//         cb(id, data);
//     }

//     /**
//      * Removes a record by id in O(1) time by swapping with last element (unordered remove).
//      * Calls cb(id) after removal. Inactive records are packed at the end.
//      * @param id The id of the record to remove.
//      * @param cb Optional callback invoked after removal.
//      */
//     fastRemove(id: number, cb: (id: number) => void = () => {}) {
//         this.validateId(id);
//         // 0) look up the index for this id
//         const idx = this.getIndexFromId(id);

//         const lastIdx = this._length - 1;
//         const removedId = id;

//         // 1) if we’re not removing the last record, swap last → idx
//         if (idx !== lastIdx) {
//             // swap the raw data in the TypedArray
//             swapNumericArray(
//                 this._buffer,
//                 this.recordOffset(idx),
//                 this.recordOffset(lastIdx),
//                 this._stride
//             );
//             // fix up the mappings for the record that just moved into `idx`
//             const movedId = this._indexToIds.get(lastIdx);
//             if (movedId === undefined) {
//                 throw new Error(`[DataBuffer] - No record with id ${lastIdx}`);
//             }
//             this._indexToIds.set(idx, movedId);
//             this._idsToIndex.set(movedId, idx);
//         }

//         // 2) clear out the old “last” slot’s mappings
//         //    (optional: choose a sentinel if you need to detect empties later)
//         this._indexToIds.delete(lastIdx);
//         this._idsToIndex.delete(removedId);

//         // 3) shrink length, and adjust active count if we nuked an active one
//         this._length--;
//         if (idx < this._active) {
//             this._active--;
//         }

//         if (DEBUG) this.assertConsistency();

//         // 4) call the callback with the removed id
//         cb(removedId);
//     }

//     /** Updates the record data for the given id. Data must match stride and type. */
//     updateRecord(id: number, data: T) {
//         this.validateId(id);
//         const idx = this.getIndexFromId(id);
//         this.validateIndex(idx);
//         this.validateData(data);
//         this._buffer.set(data, this.recordOffset(idx));
//     }

//     /**
//      * Returns a Proxy view of the record's TypedArray slice.
//      * Writes to this proxy are forwarded to updateRecord for safety.
//      * The view shares internal buffer; treat as read-only or use slice().
//      * @param id Record id to view.
//      */
//     viewRecord(id: number): T {
//         this.validateId(id);
//         const idx = this.getIndexFromId(id);
//         this.validateIndex(idx);

//         // raw view on the buffer
//         const start = this.recordOffset(idx);
//         const rawView = this._buffer.subarray(start, start + this._stride) as T;

//         // capture `this` and `id` for the Proxy handler
//         const self = this;

//         return new Proxy(rawView, {
//             set(target, prop, value) {
//                 // only intercept numeric writes: prop comes in as a string
//                 if (typeof prop === "string" && /^[0-9]+$/.test(prop)) {
//                     const elementIndex = Number(prop);
//                     if (elementIndex < 0 || elementIndex >= self._stride) {
//                         throw new Error(
//                             `[DataBuffer] - Record index ${elementIndex} out of stride bounds`
//                         );
//                     }
//                     // copy the existing data, apply the change
//                     const copy = target.slice() as T;
//                     copy[elementIndex] = value as T[number];

//                     // route through your normal updateRecord (runs validateData, etc.)
//                     self.updateRecord(id, copy);

//                     // reflect the change in the live view so further reads see it immediately
//                     target[elementIndex] = value as T[number];
//                     return true;
//                 }

//                 // all other props just forward to the TypedArray
//                 return Reflect.set(target, prop, value);
//             },

//             // forward all other operations unchanged
//             get(target, prop, receiver) {
//                 return Reflect.get(target, prop, receiver);
//             },
//         });
//     }

//     /** Marks a record active by swapping it into the active region prefix. */
//     setActiveRecord(id: number) {
//         this.validateId(id);
//         const idx = this.getIndexFromId(id);
//         // already active?
//         if (idx < this._active) return;

//         const target = this._active;
//         // swap data
//         swapNumericArray(
//             this._buffer,
//             this.recordOffset(idx),
//             this.recordOffset(target),
//             this._stride
//         );

//         // --- now fix up the ID mappings ---
//         const otherId = this._indexToIds.get(target);
//         if (otherId === undefined) {
//             throw new Error(`[DataBuffer] - No record with id ${target}`);
//         }
//         // put our id into the “active” slot
//         this._indexToIds.set(target, id);
//         this._idsToIndex.set(id, target);
//         // put the other record’s id back into our old slot
//         this._indexToIds.set(idx, otherId);
//         this._idsToIndex.set(otherId, idx);

//         this._active++;

//         if (DEBUG) this.assertConsistency();
//     }

//     /** Marks a record inactive by swapping it into the inactive region suffix. */
//     unsetActiveRecord(id: number) {
//         this.validateId(id);
//         const idx = this.getIndexFromId(id);
//         // already inactive?
//         if (idx >= this._active) return;

//         const target = this._active - 1;
//         // swap data
//         swapNumericArray(
//             this._buffer,
//             this.recordOffset(idx),
//             this.recordOffset(target),
//             this._stride
//         );

//         // --- now fix up the ID mappings ---
//         const otherId = this._indexToIds.get(target);
//         if (otherId === undefined) {
//             throw new Error(`[DataBuffer] - No record with id ${target}`);
//         }
//         // move our id into the “inactive” slot
//         this._indexToIds.set(target, id);
//         this._idsToIndex.set(id, target);
//         // move the displaced id back into our old slot
//         this._indexToIds.set(idx, otherId);
//         this._idsToIndex.set(otherId, idx);

//         this._active--;

//         if (DEBUG) this.assertConsistency();
//     }

//     /** Returns a read-only view on all stored records. Call slice() for a copy. */
//     getAllRecords(): T {
//         return this._buffer.subarray(0, this.recordOffset(this._length)) as T;
//     }

//     /** Returns a read-only view on active records. Call slice() for a copy. */
//     getActiveRecords(): T {
//         return this._buffer.subarray(0, this.recordOffset(this._active)) as T;
//     }

//     /** Returns true if the record id is currently active. */
//     isActiveRecord(id: number): boolean {
//         this.validateId(id);
//         const idx = this.getIndexFromId(id);
//         return idx < this._active;
//     }

//     /** Clears all records, resetting length and active count to zero. */
//     clear() {
//         this._length = 0;
//         this._active = 0;
//         this._indexToIds.clear();
//         this._idsToIndex.clear();

//         if (DEBUG) this.assertConsistency();
//     }

//     /** Resizes buffer capacity to newCapacity. Copies existing records. */
//     resize(newCapacity: number) {
//         if (newCapacity < this._length) {
//             throw new Error(
//                 `[DataBuffer] - New capacity ${newCapacity} < current length ${this._length}`
//             );
//         }
//         const newBuffer = new this._bufferCtor(newCapacity * this._stride) as T;
//         newBuffer.set(
//             this._buffer.subarray(0, this.recordOffset(this._length))
//         );
//         this._buffer = newBuffer;
//         this._capacity = newCapacity;

//         if (DEBUG) this.assertConsistency();
//     }

//     /**
//      * Yields [id, recordView] for every record, in buffer order (unordered by insertion).
//      * Views share internal buffer; treat as read-only or use slice().
//      */
//     public *entries(): IterableIterator<[number, T]> {
//         // walk through every record slot 0.._length-1
//         for (let idx = 0; idx < this._length; idx++) {
//             const id = this._indexToIds.get(idx)!; // get the ID at slot idx
//             const record = this.viewRecord(id); // or slice via buffer+offset
//             yield [id, record]; // emit a tuple
//         }
//     }

//     /**
//      * Yields [id, recordView] for active records only.
//      * Views share internal buffer; treat as read-only or use slice().
//      */
//     public *activeEntries(): IterableIterator<[number, T]> {
//         // only go 0.._active-1
//         for (let idx = 0; idx < this._active; idx++) {
//             const id = this._indexToIds.get(idx)!;
//             const record = this.viewRecord(id);
//             yield [id, record];
//         }
//     }
// }

/**
 * DataBuffer<T> manages a pool of fixed-size records in a TypedArray for high-performance storage and retrieval.
 *
 * Features:
 * - O(1) add, fastRemove, setActiveRecord, unsetActiveRecord via swap-pop to keep records packed.
 * - Separates records into an 'active' prefix and 'inactive' suffix for quick filtering.
 * - Uses numeric IDs to index records; keep in mind insertion order is not preserved.
 * - Methods returning TypedArray views are read-only; call .slice() for an independent copy.
 *
 * Use CLUSTER_ENGINE_DEBUG=true to enable runtime invariant checks (length, capacity, ID maps).
 *
 * @template T TypedArray type (e.g., Float32Array).
 * @param dataType TypedArray constructor to use.
 * @param capacity Initial number of records.
 * @param stride Elements per record (must be ≥1).
 */
class FixedSizeDataBuffer<T extends NumericArray> {
    private static CAPACITY = 256; // max capacity for TypedArray

    private _bufferCtor: NumericArrayConstructor;
    private _buffer: T;
    private _length = 0;
    private _active = 0;
    private _stride: number;

    // since every record has a recodrId, we doo bookkeeping to keep track of the recodr ids
    // locations of the records in the buffer
    private _indexToIds: Map<number, number>;
    private _idsToIndex: Map<number, number>;

    /** DataBuffer is a wrapper around a TypedArray
     * it's a partitioned buffer that allows to add, remove and view records
     * and flag them as "active".
     * the active records live in the first part of the buffer
     * and the inactive records live in the second part of the buffer
     *
     * NOTE: fastRemove, setActiveRecord, and unsetActiveRecord swap elements to keep the buffer packed.
     *       Consequently, insertion order is not preserved and iteration order (entries/activeEntries) is unstable.
     * @param dataType - the TypedArray constructor to use
     * @param stride - the number of elements per record
     * @note Stride must be ≥ 1 by design; using stride=0 for a scalar buffer would require special-case offset handling and is not supported.
     */
    constructor(dataType: NumericArrayConstructor, stride: number = 1) {
        if (stride < 1) {
            throw new Error("[DataBuffer] - stride must be ≥ 1");
        }
        this._bufferCtor = dataType;
        this._stride = stride;
        this._buffer = new dataType(FixedSizeDataBuffer.CAPACITY * stride) as T;
        this._indexToIds = new Map<number, number>();
        this._idsToIndex = new Map<number, number>();
    }

    /** index → absolute offset */
    private recordOffset(index: number): number {
        return index * this._stride;
    }

    /** check that id is a valid integer */
    private validateId(id: number): void {
        if (!Number.isInteger(id) || id < 0) {
            throw new Error(`[DataBuffer] - Invalid id ${id}`);
        }
    }

    /** check that `data` is the right TypedArray and length */
    private validateData(data: T): void {
        if (data.constructor !== this._buffer.constructor) {
            throw new Error(
                `[DataBuffer] - Data type ${data.constructor.name} does not match buffer type ${this._buffer.constructor.name}`
            );
        }
        if (data.length !== this._stride) {
            throw new Error(
                `[DataBuffer] - Data length ${data.length} does not match stride ${this._stride}`
            );
        }
    }

    /** Validates that an index is within [0, length). Throws otherwise. */
    private validateIndex(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this._length) {
            throw new Error(`[DataBuffer] - Index out of bounds: ${index}`);
        }
    }

    /** Retrieves the buffer index for a given record id. Throws if not found. */
    private getIndexFromId(id: number): number {
        const idx = this._idsToIndex.get(id);
        if (
            idx === undefined ||
            !Number.isInteger(idx) ||
            idx < 0 ||
            idx >= this._length ||
            this._indexToIds.get(idx) !== id
        ) {
            throw new Error(`[DataBuffer] - No record with id ${id}`);
        }
        return idx;
    }

    /** Runs internal invariant checks. Only enabled in debug/development mode. */
    private assertConsistency(): void {
        if (this._length > FixedSizeDataBuffer.CAPACITY) {
            throw new Error(
                `[DataBuffer] - Invariant violation: length ${this._length} > capacity ${FixedSizeDataBuffer.CAPACITY}`
            );
        }
        if (this._active > this._length) {
            throw new Error(
                `[DataBuffer] - Invariant violation: active ${this._active} > length ${this._length}`
            );
        }
        if (this._indexToIds.size !== this._length) {
            throw new Error(
                `[DataBuffer] - Invariant violation: indexToIds.size ${this._indexToIds.size} != length ${this._length}`
            );
        }
        if (this._idsToIndex.size !== this._length) {
            throw new Error(
                `[DataBuffer] - Invariant violation: idsToIndex.size ${this._idsToIndex.size} != length ${this._length}`
            );
        }
        for (const [id, idx] of this._idsToIndex) {
            const mapped = this._indexToIds.get(idx);
            if (mapped !== id) {
                throw new Error(
                    `[DataBuffer] - Invariant violation: mismatch at index ${idx}, expected id ${id}, found ${mapped}`
                );
            }
        }
    }

    /**
     * Adds a new record with the given id and data.
     * Grows the buffer dynamically if needed (capacity ↑). Calls cb(id, data) after add.
     * O(1) average time via swap-pop when inactive slots exist.
     * @param id Unique integer id for the record.
     * @param data TypedArray of length `stride` containing the record.
     * @param cb Optional callback invoked after insertion.
     */
    addRecord(
        id: number,
        data: T,
        cb: (id: number, data: T) => void = () => {}
    ) {
        this.validateId(id);
        this.validateData(data);
        if (this._length >= FixedSizeDataBuffer.CAPACITY) {
            throw new Error(
                `[DataBuffer] - Buffer capacity ${FixedSizeDataBuffer.CAPACITY} exceeded`
            );
        }
        // optional: prevent duplicate IDs
        if (this._idsToIndex.get(id) !== undefined) {
            throw new Error(
                `[DataBuffer] - Record with id ${id} already exists`
            );
        }

        // Case 1: no inactive slots → just append at the tail
        if (this._length === this._active) {
            const idx = this._length;
            this._buffer.set(data, this.recordOffset(idx));
            this._indexToIds.set(idx, id);
            this._idsToIndex.set(id, idx);
            this._length++;
            this._active++;

            // assert that the new record is at the end of the active records
            if (DEBUG) this.assertConsistency();

            // 6) call the callback with the new id and data
            cb(id, data);
            return;
        }

        // Case 2: there *is* an inactive record at `active`
        const targetIdx = this._active;
        const freeIdx = this._length;

        // 1) remember the ID that’s currently at targetIdx
        const displacedId = this._indexToIds.get(targetIdx);
        if (displacedId === undefined) {
            throw new Error(`[DataBuffer] - No record with id ${targetIdx}`);
        }

        // 2) swap its data with the first free slot at `length`
        swapNumericArray(
            this._buffer,
            this.recordOffset(targetIdx),
            this.recordOffset(freeIdx),
            this._stride
        );

        // 3) write the new record into the now-vacated `targetIdx`
        this._buffer.set(data, this.recordOffset(targetIdx));

        // 4) update mappings for the **new** record
        this._indexToIds.set(targetIdx, id);
        this._idsToIndex.set(id, targetIdx);

        // 5) update mappings for the **displaced** record
        this._indexToIds.set(freeIdx, displacedId);
        this._idsToIndex.set(displacedId, freeIdx);

        this._active++;
        this._length++;

        if (DEBUG) this.assertConsistency();

        // 6) call the callback with the new id and data
        cb(id, data);
    }

    /**
     * Removes a record by id in O(1) time by swapping with last element (unordered remove).
     * Calls cb(id) after removal. Inactive records are packed at the end.
     * @param id The id of the record to remove.
     * @param cb Optional callback invoked after removal.
     */
    fastRemove(id: number, cb: (id: number) => void = () => {}) {
        this.validateId(id);
        // 0) look up the index for this id
        const idx = this.getIndexFromId(id);

        const lastIdx = this._length - 1;
        const removedId = id;

        // 1) if we’re not removing the last record, swap last → idx
        if (idx !== lastIdx) {
            // swap the raw data in the TypedArray
            swapNumericArray(
                this._buffer,
                this.recordOffset(idx),
                this.recordOffset(lastIdx),
                this._stride
            );
            // fix up the mappings for the record that just moved into `idx`
            const movedId = this._indexToIds.get(lastIdx);
            if (movedId === undefined) {
                throw new Error(`[DataBuffer] - No record with id ${lastIdx}`);
            }
            this._indexToIds.set(idx, movedId);
            this._idsToIndex.set(movedId, idx);
        }

        // 2) clear out the old “last” slot’s mappings
        //    (optional: choose a sentinel if you need to detect empties later)
        this._indexToIds.delete(lastIdx);
        this._idsToIndex.delete(removedId);

        // 3) shrink length, and adjust active count if we nuked an active one
        this._length--;
        if (idx < this._active) {
            this._active--;
        }

        if (DEBUG) this.assertConsistency();

        // 4) call the callback with the removed id
        cb(removedId);
    }

    /** Updates the record data for the given id. Data must match stride and type. */
    updateRecord(id: number, data: T) {
        this.validateId(id);
        const idx = this.getIndexFromId(id);
        this.validateIndex(idx);
        this.validateData(data);
        this._buffer.set(data, this.recordOffset(idx));
    }

    /**
     * Returns a raw view of the record's TypedArray slice.
     * The view shares internal buffer; treat as read-only or use slice().
     * @param id Record id to view.
     */
    viewRecord(id: number): T {
        this.validateId(id);
        const idx = this.getIndexFromId(id);
        this.validateIndex(idx);

        // raw view on the buffer
        const start = this.recordOffset(idx);
        return this._buffer.subarray(start, start + this._stride) as T;
    }

    /** Marks a record active by swapping it into the active region prefix. */
    setActiveRecord(id: number) {
        this.validateId(id);
        const idx = this.getIndexFromId(id);
        // already active?
        if (idx < this._active) return;

        const target = this._active;
        // swap data
        swapNumericArray(
            this._buffer,
            this.recordOffset(idx),
            this.recordOffset(target),
            this._stride
        );

        // --- now fix up the ID mappings ---
        const otherId = this._indexToIds.get(target);
        if (otherId === undefined) {
            throw new Error(`[DataBuffer] - No record with id ${target}`);
        }
        // put our id into the “active” slot
        this._indexToIds.set(target, id);
        this._idsToIndex.set(id, target);
        // put the other record’s id back into our old slot
        this._indexToIds.set(idx, otherId);
        this._idsToIndex.set(otherId, idx);

        this._active++;

        if (DEBUG) this.assertConsistency();
    }

    /** Marks a record inactive by swapping it into the inactive region suffix. */
    unsetActiveRecord(id: number) {
        this.validateId(id);
        const idx = this.getIndexFromId(id);
        // already inactive?
        if (idx >= this._active) return;

        const target = this._active - 1;
        // swap data
        swapNumericArray(
            this._buffer,
            this.recordOffset(idx),
            this.recordOffset(target),
            this._stride
        );

        // --- now fix up the ID mappings ---
        const otherId = this._indexToIds.get(target);
        if (otherId === undefined) {
            throw new Error(`[DataBuffer] - No record with id ${target}`);
        }
        // move our id into the “inactive” slot
        this._indexToIds.set(target, id);
        this._idsToIndex.set(id, target);
        // move the displaced id back into our old slot
        this._indexToIds.set(idx, otherId);
        this._idsToIndex.set(otherId, idx);

        this._active--;

        if (DEBUG) this.assertConsistency();
    }

    /** Returns a read-only view on all stored records. Call slice() for a copy. */
    getAllRecords(): T {
        return this._buffer.subarray(0, this.recordOffset(this._length)) as T;
    }

    /** Returns a read-only view on active records. Call slice() for a copy. */
    getActiveRecords(): T {
        return this._buffer.subarray(0, this.recordOffset(this._active)) as T;
    }

    /** Returns true if the record id is currently active. */
    isActiveRecord(id: number): boolean {
        this.validateId(id);
        const idx = this.getIndexFromId(id);
        return idx < this._active;
    }

    /** Clears all records, resetting length and active count to zero. */
    clear() {
        this._length = 0;
        this._active = 0;
        this._indexToIds.clear();
        this._idsToIndex.clear();

        if (DEBUG) this.assertConsistency();
    }

    /**
     * Yields [id, recordView] for every record, in buffer order (unordered by insertion).
     * Views share internal buffer; treat as read-only or use slice().
     */
    public *entries(): IterableIterator<[number, T]> {
        // walk through every record slot 0.._length-1
        for (let idx = 0; idx < this._length; idx++) {
            const id = this._indexToIds.get(idx)!; // get the ID at slot idx
            const record = this.viewRecord(id); // or slice via buffer+offset
            yield [id, record]; // emit a tuple
        }
    }

    /**
     * Yields [id, recordView] for active records only.
     * Views share internal buffer; treat as read-only or use slice().
     */
    public *activeEntries(): IterableIterator<[number, T]> {
        // only go 0.._active-1
        for (let idx = 0; idx < this._active; idx++) {
            const id = this._indexToIds.get(idx)!;
            const record = this.viewRecord(id);
            yield [id, record];
        }
    }
}

const dataBuffer = new FixedSizeDataBuffer(Uint16Array, 4);

dataBuffer.addRecord(1, new Uint16Array([1, 2, 3, 4]));

export default () => {
    type ArchetypeSchema = 0;
    const CAPACITY = 256; // max capacity for TypedArray

    const position = {
        x: 0,
        y: 0,
        z: 0,
    };

    const velocity = {
        x: 0,
        y: 0,
        z: 0,
    };

    const stride = 6;
    const buffer = new ArrayBuffer(CAPACITY * 6);
    const positionData = new Float32Array(buffer);
    const velocityData = new Float32Array(buffer);

    function addRecord(id: number, data: Record<string, number | number>[]) {
        for (const item of data) {
            for (const key in item) {
            }
        }
    }

    addRecord(1, [position, velocity]);
};
