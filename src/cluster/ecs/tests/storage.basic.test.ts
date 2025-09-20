// src/cluster/ecs/tests/storage.v2.basic.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Storage } from "../storage";
import { Archetype } from "../archetype";

enum Component {
    Position,
}

const schema = Archetype.register({
    type: Component.Position,
    name: "Position",
    count: 8,
    buffer: Float32Array,
    default: [0, 0, 0, 0, 0, 0, 0, 0], // currX, currY, prevX, prevY, minx, minY, maxX, maxY
    // prettier-ignore
    fields: [
        "x",
        "y",
        "prevX",
        "prevY",
        "minX",
        "minY",
        "maxX",
        "maxY"
    ],
});

const archetype = Archetype.create("basic", schema);

describe("StorageV2 ▶ basic operations", () => {
    let storage: Storage<typeof schema>;

    beforeEach(() => {
        storage = new Storage(archetype);
    });

    it("starts empty with length = 0", () => {
        expect(storage.length).toBe(0);
        expect(storage.isEmpty).toBe(true);
    });

    it("allocates a new chunk and a row", () => {
        const { chunkId, row, generation } = storage.allocate();
        expect(typeof chunkId).toBe("number");
        expect(row).toBe(0);
        expect(generation).toBe(0);
        expect(storage.length).toBe(1);
        expect(storage.isEmpty).toBe(false);
    });

    it("assigns values correctly", () => {
        const { chunkId, row, generation } = storage.allocate();
        const result = storage.assign(chunkId, row, generation, {
            [Component.Position]: [10, 20],
        });
        expect(result!.chunkId).toBe(chunkId);
        expect(result!.row).toBe(row);

        const chunk = storage.getChunk(chunkId)!;
        const view = chunk.getView<Float32Array>(schema[0]);
        expect(view[row * 2 + 0]).toBe(10);
        expect(view[row * 2 + 1]).toBe(20);
    });

    it("deletes a row correctly", () => {
        const { chunkId, row, generation } = storage.allocate();
        const result = storage.delete(chunkId, row, generation);
        expect(result).toBeDefined();
        expect(result!.chunkId).toBe(chunkId);
        expect(result!.row).toBe(row);
        expect(result!.generation).toBe(0); // fixed expectation
        expect(result!.movedRow).toBeUndefined();
        expect(storage.length).toBe(0);
        expect(storage.isEmpty).toBe(true);
    });
});
