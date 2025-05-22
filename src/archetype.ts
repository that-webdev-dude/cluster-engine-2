import { Schema } from "./cluster/ecs/Schema";
import {
    ComponentInstance,
    ComponentLayout,
    ComponentFactory,
} from "./cluster/ecs/Component";

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

const PositionComponentSchema: Schema = {
    name: "Position",
    fields: {
        x: {
            type: "float",
            count: 1,
            default: 11,
        },
        y: {
            type: "float",
            count: 1,
            default: 11,
        },
    },
} satisfies Schema;

const VelocityComponentSchema: Schema = {
    name: "Velocity",
    fields: {
        x: {
            type: "float",
            count: 1,
            default: 22,
        },
        y: {
            type: "float",
            count: 1,
            default: 22,
        },
    },
} satisfies Schema;

const PositionComponent = new ComponentFactory(
    PositionComponentSchema
).create();
const VelocityComponent = new ComponentFactory(
    VelocityComponentSchema
).create();

const PositionComponentLayout = new ComponentLayout(
    PositionComponentSchema
).build();
const VelocityComponentLayout = new ComponentLayout(
    VelocityComponentSchema,
    "packed"
).build();

class DataBuffer {
    private _capacity: number = 4;
    private _length: number = 0;
    private _stride: number = 0;
    private _buffer: Float32Array = new Float32Array(0);

    // bookkeeping
    private _idToIndex: (number | null)[] = [];
    private _indexToId: (number | null)[] = [];

    constructor(private _schema: Schema) {
        this._stride = Object.entries(this._schema.fields).reduce(
            (acc, [_, value]) => {
                return acc + value.count;
            },
            0
        );

        this._idToIndex = Array(this._capacity).fill(null);
        this._indexToId = Array(this._capacity).fill(null);
    }

    private _validateComponent(component: ComponentInstance<Schema>) {
        // the component must have matching name and keys to the schema
        if (!(this._schema.name === component.name)) {
            throw new Error(
                `Component name ${component.name} does not match schema name ${this._schema.name}`
            );
        }

        Object.keys(this._schema.fields).forEach((key) => {
            if (!(key in component)) {
                throw new Error(
                    `Component ${key} does not exist in schema ${this._schema.name}`
                );
            }
            // ... other checks here
        });
    }

    addRecord(id: number, component: ComponentInstance<Schema>) {
        if (id < 0 || id >= this._capacity) {
            throw new Error(
                `ID ${id} out of bounds (0..${this._capacity - 1})`
            );
        }
        if (this._idToIndex[id] != null) {
            throw new Error(`ID ${id} already exists in buffer`);
        }
        if (this._length >= this._capacity) {
            throw new Error(`Buffer full (capacity=${this._capacity})`);
        }

        this._validateComponent(component);

        if (this._buffer.length === 0) {
            this._buffer = new Float32Array(this._capacity * this._stride).fill(
                NaN
            );
        }

        let idx = this._length * this._stride;
        Object.keys(this._schema.fields).forEach((key) => {
            if (Array.isArray(component[key])) {
                component[key].forEach((value) => {
                    this._buffer[idx] = value;
                    idx++;
                });
            } else {
                this._buffer[idx] = component[key] as number;
                idx++;
            }
        });

        this._idToIndex[id] = this._length;
        this._indexToId[this._length] = id;
        this._length++;
    }

    removeRecord(id: number) {
        // 1) validate
        const idx = this._idToIndex[id];
        if (idx == null) {
            throw new Error(`ID ${id} not found`);
        }
        const lastIdx = this._length - 1;

        // 2) if not removing the last slot, swap last → idx
        if (idx !== lastIdx) {
            const a = idx * this._stride;
            const b = lastIdx * this._stride;
            swapNumericArray(this._buffer, a, b, this._stride);

            // update the moved entity’s maps
            const movedId = this._indexToId[lastIdx]!;
            this._idToIndex[movedId] = idx;
            this._indexToId[idx] = movedId;
        }

        // 3) clear out the old last slot (now either empty or already swapped)
        const base = lastIdx * this._stride;
        this._buffer.subarray(base, base + this._stride).fill(NaN);

        // 4) null out both maps for removed ID & old last index
        this._idToIndex[id] = null;
        this._indexToId[lastIdx] = null;

        // 5) shrink length
        this._length--;
    }
}

export default () => {
    // 1) Tiny schema, stride = 2
    const TestSchema: Schema = {
        name: "Test",
        fields: {
            a: { type: "float", count: 1, default: 0 },
            b: { type: "float", count: 1, default: 0 },
        },
    } satisfies Schema;

    type TestComp = { name: string; a: number; b: number };

    // simple factory
    const makeComp = (a: number, b: number): TestComp => ({
        name: "Test",
        a,
        b,
    });

    // in-file assert helper
    function assert(cond: boolean, msg?: string): asserts cond {
        if (!cond) throw new Error(msg || "Assertion failed");
    }

    function testRemoveZero() {
        const db = new DataBuffer(TestSchema) as any; // hack to reach privates

        for (let id = 0; id < 4; id++) {
            db.addRecord(id, makeComp(id, id + 0.5));
        }
        // buffer: [0,0.5, 1,1.5, 2,2.5, 3,3.5]

        db.removeRecord(0);

        const buf: Float32Array = db._buffer;
        const idToIdx: (number | null)[] = db._idToIndex;
        const idxToId: (number | null)[] = db._indexToId;
        const len: number = db._length;
        const stride = 2;

        // slot 0 got [3,3.5]
        assert(buf[0] === 3, `buf[0] was ${buf[0]}`);
        assert(buf[1] === 3.5, `buf[1] was ${buf[1]}`);

        // old last slot cleared
        assert(Number.isNaN(buf[6]), `buf[6] was ${buf[6]}`);
        assert(Number.isNaN(buf[7]), `buf[7] was ${buf[7]}`);

        // maps
        assert(idToIdx[0] === null, `idToIdx[0] = ${idToIdx[0]}`);
        assert(idToIdx[3] === 0, `idToIdx[3] = ${idToIdx[3]}`);
        assert(idxToId[0] === 3, `idxToId[0] = ${idxToId[0]}`);
        assert(idxToId[3] === null, `idxToId[3] = ${idxToId[3]}`);

        // length
        assert(len === 3, `length = ${len}`);
        console.log("✅ testRemoveZero passed");
    }

    function testRemoveMiddle() {
        const db = new DataBuffer(TestSchema) as any;
        for (let id = 0; id < 4; id++) {
            db.addRecord(id, makeComp(id, id + 0.5));
        }

        db.removeRecord(2);

        const buf: Float32Array = db._buffer;
        const idToIdx: (number | null)[] = db._idToIndex;
        const idxToId: (number | null)[] = db._indexToId;
        const len: number = db._length;

        // slot 2 → [3,3.5], slot 3 cleared
        assert(buf[4] === 3 && buf[5] === 3.5, `slot2=[${buf[4]},${buf[5]}]`);
        assert(Number.isNaN(buf[6]) && Number.isNaN(buf[7]), "slot3 not NaN");

        // maps
        assert(idToIdx[2] === null, `idToIdx[2]=${idToIdx[2]}`);
        assert(idToIdx[3] === 2, `idToIdx[3]=${idToIdx[3]}`);
        assert(idxToId[2] === 3, `idxToId[2]=${idxToId[2]}`);
        assert(idxToId[3] === null, `idxToId[3]=${idxToId[3]}`);

        assert(len === 3, `length=${len}`);
        console.log("✅ testRemoveMiddle passed");
    }

    function main() {
        testRemoveZero();
        testRemoveMiddle();
        console.log("🎉 All tests passed!");
    }

    main();
};
