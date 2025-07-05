import { describe, it, expect, beforeEach } from "vitest";
import { Chunk } from "../chunk";
import { Archetype } from "../archetype";

export enum Component {
    Position,
}

const DESCRIPTORS = Archetype.register(
    ...[
        {
            type: Component.Position,
            name: "Position",
            count: 2,
            buffer: Float32Array,
            default: [0, 0],
        },
    ]
);

describe("Chunk", () => {
    // Create an archetype with just the Position component
    const archetype = Archetype.create("test", [Component.Position]);
    let chunk: Chunk<typeof DESCRIPTORS>;

    beforeEach(() => {
        chunk = new Chunk(archetype);
    });

    it("initializes with count 0 and correct capacity", () => {
        expect(chunk.count).toBe(0);
        expect(chunk.capacity).toBe(
            archetype.maxEntities || Chunk.DEFAULT_CAPACITY
        );
        expect(chunk.full).toBe(false);
    });

    it("allocates entities and increments count", () => {
        const firstIndex = chunk.allocate();
        expect(firstIndex).toBe(0);
        expect(chunk.count).toBe(1);

        const secondIndex = chunk.allocate();
        expect(secondIndex).toBe(1);
        expect(chunk.count).toBe(2);
    });

    it("initializes components to default values", () => {
        const posView = chunk.getView<Float32Array>(DESCRIPTORS[0]);
        // Row 0 default [0,0]
        expect(posView[0]).toBe(0);
        expect(posView[1]).toBe(0);
        // Row 1 default [0,0]
        expect(posView[2]).toBe(0);
        expect(posView[3]).toBe(0);
    });

    it("throws when allocating beyond capacity", () => {
        const cap = chunk.capacity;
        // fill up to capacity
        for (let i = chunk.count; i < cap; i++) {
            chunk.allocate();
        }

        expect(chunk.full).toBe(true);
        expect(() => chunk.allocate()).toThrow(/Chunk is full/);
    });

    it("deletes last entity and shrinks count without swapping", () => {
        // allocate two more to ensure at least 2
        chunk.allocate();
        chunk.allocate();
        const before = chunk.count;
        // delete last
        const result = chunk.delete(chunk.count - 1);
        expect(result).toBeUndefined();
        expect(chunk.count).toBe(before - 1);
    });

    it("deletes non-last entity and swaps with last", () => {
        // Ensure at least 3
        while (chunk.count < 3) {
            chunk.allocate();
        }
        const countBefore = chunk.count;
        const target = 1;
        // Set a distinct value in last row to detect swap
        const posView = chunk.getView<Float32Array>(DESCRIPTORS[0]);
        const lastRow = chunk.count - 1;
        posView[lastRow * 2] = 42; // x of last row
        posView[lastRow * 2 + 1] = 99; // y of last row

        const movedRow = chunk.delete(target);
        expect(movedRow).toBe(lastRow);
        expect(chunk.count).toBe(countBefore - 1);

        // Check that row 'target' now has the former last's values
        expect(posView[target * 2]).toBe(42);
        expect(posView[target * 2 + 1]).toBe(99);
    });

    it("dispose zeros header and marks destroyed", () => {
        const c2 = new Chunk(archetype);
        c2.allocate();
        c2.dispose();
        expect(() => c2.count).toThrow(/destroyed/);
    });
});
