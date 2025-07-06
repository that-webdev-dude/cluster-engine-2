// src/cluster/ecs/tests/storage.v2.extras.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { StorageV2 } from "../storage";
import { Archetype } from "../archetype";

enum Component {
    Position,
    Velocity,
    Health,
}

const DESCS = Archetype.register(
    {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
    },
    {
        type: Component.Health,
        name: "Health",
        count: 1,
        buffer: Uint32Array,
        default: [100],
    }
);

const archetype = Archetype.create("extras", [
    Component.Position,
    Component.Velocity,
    Component.Health,
]);

describe("StorageV2 ▶ edge and complex cases", () => {
    let storage: StorageV2<typeof DESCS>;

    beforeEach(() => {
        storage = new StorageV2(archetype);
    });

    it("throws when assigning to invalid chunkId", () => {
        expect(() => {
            storage.assign(999, 0, {
                [Component.Position]: [1, 2],
            });
        }).toThrow(/doesn't exists/);
    });

    it("throws on assign with missing component type", () => {
        const { chunkId, row } = storage.allocate();
        expect(() => {
            storage.assign(chunkId, row, {
                [9999]: [0, 0],
            } as any);
        }).toThrow(/not in the archetype descriptors/);
    });

    it("throws when component data is wrong length", () => {
        const { chunkId, row } = storage.allocate();
        expect(() => {
            storage.assign(chunkId, row, {
                [Component.Position]: [1, 2, 3],
            });
        }).toThrow(/must be an array of length/);
    });

    it("reuses chunks if not full", () => {
        const allocA = storage.allocate();
        const allocB = storage.allocate();
        storage.delete(allocA.chunkId, allocA.row);
        const allocC = storage.allocate();
        expect(allocC.chunkId).toBe(allocA.chunkId); // Reused
    });

    it("removes chunk when last entity deleted", () => {
        const alloc = storage.allocate();
        expect(storage.getChunk(alloc.chunkId)).toBeDefined();
        storage.delete(alloc.chunkId, alloc.row);
        expect(storage.getChunk(alloc.chunkId)).toBeUndefined();
    });

    it("does not allow allocation past maxEntities", () => {
        const capped = Archetype.create("limited", [Component.Health], 2);
        const storageCapped = new StorageV2<typeof DESCS>(capped);

        storageCapped.allocate();
        storageCapped.allocate();
        expect(() => storageCapped.allocate()).toThrow(
            /limited number of entities/
        );
    });
});
