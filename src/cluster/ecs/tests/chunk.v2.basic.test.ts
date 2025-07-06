// src/cluster/ecs/tests/chunk.v2.basic.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { ChunkV2 } from "../chunk";
import { Archetype } from "../archetype";

export enum Component {
    Position,
}

const DESCRIPTORS = Archetype.register({
    type: Component.Position,
    name: "Position",
    count: 2,
    buffer: Float32Array,
    default: [0, 0],
});

describe("ChunkV2 ▶ basic functionality", () => {
    let chunk: ChunkV2<typeof DESCRIPTORS>;
    const archetype = Archetype.create("test", [Component.Position]);

    beforeEach(() => {
        chunk = new ChunkV2(archetype);
    });

    it("initializes with count 0, correct capacity, full=false, and generation=0", () => {
        expect(chunk.count).toBe(0);
        expect(chunk.capacity).toBe(
            archetype.maxEntities || ChunkV2.DEFAULT_CAPACITY
        );
        expect(chunk.full).toBe(false);

        // generation array was zero-initialized
        expect(chunk.getGeneration(0)).toBe(0);
    });

    it("allocate() returns {row, generation} and bumps count", () => {
        const first = chunk.allocate();
        expect(first.row).toBe(0);
        expect(first.generation).toBe(0);
        expect(chunk.count).toBe(1);
        expect(chunk.getGeneration(0)).toBe(0);

        const second = chunk.allocate();
        expect(second.row).toBe(1);
        expect(second.generation).toBe(0);
        expect(chunk.count).toBe(2);
        expect(chunk.getGeneration(1)).toBe(0);
    });

    it("initializes component data to defaults", () => {
        const { row } = chunk.allocate();
        const pos = chunk.getView<Float32Array>(DESCRIPTORS[0]);
        // default [0,0]
        expect(pos[row * 2 + 0]).toBe(0);
        expect(pos[row * 2 + 1]).toBe(0);
    });

    it("throws when allocating past capacity", () => {
        // fill to capacity
        for (let i = 0; i < chunk.capacity; i++) {
            chunk.allocate();
        }
        expect(chunk.full).toBe(true);
        expect(() => chunk.allocate()).toThrow(/full/);
    });

    it("delete(last) returns undefined movedRow and bumps only that row’s generation", () => {
        // allocate two rows
        chunk.allocate(); // row0
        const { row: lastRow } = chunk.allocate(); // row1
        const beforeGen = chunk.getGeneration(lastRow);

        const result = chunk.delete(lastRow);
        expect(result.movedRow).toBeUndefined();
        expect(result.row).toBe(lastRow);
        expect(result.generation).toBe(beforeGen);

        expect(chunk.count).toBe(1);
        // generation at lastRow was incremented
        expect(chunk.getGeneration(lastRow)).toBe(beforeGen + 1);
    });

    it("delete(non-last) swaps data+generation and bumps freed slot", () => {
        // allocate 3 rows: 0,1,2
        const a = chunk.allocate();
        const b = chunk.allocate();
        const c = chunk.allocate();
        const lastRow = c.row;
        const target = a.row; // 0

        // write a distinct value into lastRow’s data
        const pos = chunk.getView<Float32Array>(DESCRIPTORS[0]);
        pos[lastRow * 2 + 0] = 42;
        pos[lastRow * 2 + 1] = 99;
        const genLast = chunk.getGeneration(lastRow);

        const { row, generation, movedRow } = chunk.delete(target);
        expect(row).toBe(target);
        expect(movedRow).toBe(lastRow);
        expect(generation).toBe(genLast);
        expect(chunk.count).toBe(2);

        // data moved into target
        expect(pos[target * 2 + 0]).toBe(42);
        expect(pos[target * 2 + 1]).toBe(99);
        // generation moved into target
        expect(chunk.getGeneration(target)).toBe(genLast);
        // freed lastRow got its generation bumped
        expect(chunk.getGeneration(lastRow)).toBe(genLast + 1);
    });

    it("getGeneration(row) throws when out of bounds", () => {
        expect(() => chunk.getGeneration(-1)).toThrow(/out of bounds/);
        expect(() => chunk.getGeneration(chunk.capacity)).toThrow(
            /out of bounds/
        );
    });

    it("all public APIs throw after dispose()", () => {
        chunk.allocate();
        chunk.dispose();

        const methods: Array<[string, () => any]> = [
            ["count", () => chunk.count],
            ["byteCapacity", () => chunk.byteCapacity],
            ["full", () => chunk.full],
            ["formattedArchetype", () => chunk.formattedArchetype],
            ["getGeneration", () => chunk.getGeneration(0)],
            ["allocate()", () => chunk.allocate()],
            ["delete(0)", () => chunk.delete(0)],
            ["getView()", () => chunk.getView(DESCRIPTORS[0])],
        ];

        for (const [name, fn] of methods) {
            expect(fn).toThrow(/destroyed/);
        }
    });
});
