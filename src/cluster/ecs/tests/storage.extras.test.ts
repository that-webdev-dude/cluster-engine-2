// src/cluster/ecs/tests/storage.v2.extras.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Storage } from "../storage";
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
        count: 8,
        buffer: Float32Array,
        default: [0, 0, 0, 0, 0, 0, 0, 0],
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
    },
    {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
        // prettier-ignore
        fields: [
            "x",
            "y"
        ],
    },
    {
        type: Component.Health,
        name: "Health",
        count: 1,
        buffer: Uint32Array,
        default: [100],
        // prettier-ignore
        fields: [
            "value"
        ],
    }
);

const archetype = Archetype.create("extras", DESCS);

describe("StorageV2 ▶ edge and complex cases", () => {
    let storage: Storage<typeof DESCS>;

    beforeEach(() => {
        storage = new Storage(archetype);
    });

    it("throws when assigning to invalid chunkId", () => {
        expect(() => {
            storage.assign(999, 0, 0, {
                [Component.Position]: [1, 2],
            });
        }).toThrow(/doesn't exists/);
    });

    it("throws on assign with missing component type", () => {
        const { chunkId, row, generation } = storage.allocate();
        expect(() => {
            storage.assign(chunkId, row, generation, {
                [9999]: [0, 0],
            } as any);
        }).toThrow(/not in the archetype descriptors/);
    });

    it("throws when component data is wrong length", () => {
        const { chunkId, row, generation } = storage.allocate();
        expect(() => {
            storage.assign(chunkId, row, generation, {
                [Component.Position]: [1, 2, 3],
            });
        }).toThrow(/must be an array of length/);
    });

    it("reuses chunks if not full", () => {
        const allocA = storage.allocate();
        const allocB = storage.allocate();
        storage.delete(allocA.chunkId, allocA.row, allocA.generation);
        const allocC = storage.allocate();
        expect(allocC.chunkId).toBe(allocA.chunkId); // Reused
    });

    it("removes chunk when last entity deleted", () => {
        const alloc = storage.allocate();
        expect(storage.getChunk(alloc.chunkId)).toBeDefined();
        storage.delete(alloc.chunkId, alloc.row, alloc.generation);
        expect(storage.getChunk(alloc.chunkId)).toBeUndefined();
    });

    it("does not allow allocation past maxEntities", () => {
        const schema = Archetype.register({
            type: Component.Health,
            name: "Health",
            count: 1,
            buffer: Uint32Array,
            default: [100],
            // prettier-ignore
            fields: [
                "value"
            ],
        });
        const capped = Archetype.create("limited", schema, 2);
        const storageCapped = new Storage<typeof schema>(capped);

        storageCapped.allocate();
        storageCapped.allocate();
        expect(() => storageCapped.allocate()).toThrow(
            /limited number of entities/
        );
    });
});
