// src/cluster/ecs/tests/storage.v2.basic.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { StorageV2 } from "../storageV2";
import { ArchetypeV2 } from "../archetypeV2";

enum Component {
    Position,
}

const schema = ArchetypeV2.register({
    type: Component.Position,
    name: "Position",
    count: 2,
    buffer: Float32Array,
    default: [0, 0],
});

const archetype = ArchetypeV2.create("basic", schema);

describe("StorageV2 ▶ basic operations", () => {
    let storage: StorageV2<typeof schema>;

    beforeEach(() => {
        storage = new StorageV2(archetype);
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
        const { chunkId, row } = storage.allocate();
        const result = storage.assign(chunkId, row, {
            [Component.Position]: [10, 20],
        });
        expect(result.chunkId).toBe(chunkId);
        expect(result.row).toBe(row);

        const chunk = storage.getChunk(chunkId)!;
        const view = chunk.getView<Float32Array>(schema[0]);
        expect(view[row * 2 + 0]).toBe(10);
        expect(view[row * 2 + 1]).toBe(20);
    });

    it("deletes a row correctly", () => {
        const { chunkId, row } = storage.allocate();
        const result = storage.delete(chunkId, row);
        expect(result.chunkId).toBe(chunkId);
        expect(result.row).toBe(row);
        expect(result.generation).toBe(0); // fixed expectation
        expect(result.movedRow).toBeUndefined();
        expect(storage.length).toBe(0);
        expect(storage.isEmpty).toBe(true);
    });
});
