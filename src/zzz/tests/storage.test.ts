import { describe, it, expect, beforeEach, vi } from "vitest";
import { Storage } from "../ecs/storage";
import { Chunk } from "../ecs/chunk";
import { Archetype } from "../ecs/archetype";
import { ComponentType, DESCRIPTORS } from "../ecs/components";

/* Helpers ────────────────────────────────────────────────────────────────── */

function makePosVelStorage() {
    const archetype = Archetype.create(
        ComponentType.Position,
        ComponentType.Velocity
    );

    const tuple = [
        DESCRIPTORS[ComponentType.Position],
        DESCRIPTORS[ComponentType.Velocity],
        DESCRIPTORS[ComponentType.EntityId],
    ] as const;

    return new Storage<typeof tuple>(archetype);
}

function snapshotRow(
    storage: ReturnType<typeof makePosVelStorage>,
    entityId: number
) {
    const addr = storage["entities"].get(entityId)!;
    const chunk = storage.getChunk(addr.chunkId)!;
    const pos = chunk.views.Position.subarray(addr.row * 2, addr.row * 2 + 2);
    const vel = chunk.views.Velocity.subarray(addr.row * 2, addr.row * 2 + 2);
    return {
        id: entityId,
        chunkId: addr.chunkId,
        row: addr.row,
        pos: Array.from(pos),
        vel: Array.from(vel),
    };
}

/* Tests ──────────────────────────────────────────────────────────────────── */

describe("Storage (rev 2025-05-31)", () => {
    let storage: ReturnType<typeof makePosVelStorage>;

    beforeEach(() => {
        storage = makePosVelStorage();
    });

    /* ─── Allocation ────────────────────────────────────────────────────── */

    it("allocates entities, maintains correct chunk and row addresses", () => {
        const addr1 = storage.allocate(1);
        const addr2 = storage.allocate(2);

        expect(addr1.chunkId).toBeDefined();
        expect(addr1.row).toBe(0);
        expect(addr2.row).toBe(1);

        const snap1 = snapshotRow(storage, 1);
        const snap2 = snapshotRow(storage, 2);

        expect(snap1.pos).toEqual([10, 11]);
        expect(snap2.pos).toEqual([10, 11]);
    });

    it("creates a new chunk when current chunk becomes full", () => {
        const firstChunkCapacity = Chunk.ENTITIES_PER_CHUNK;

        for (let i = 0; i < firstChunkCapacity; i++) {
            storage.allocate(i);
        }

        expect(storage["chunks"].size).toBe(1);
        expect(storage["partialChunkIds"].size).toBe(0);

        const newEntityAddr = storage.allocate(999);
        expect(storage["chunks"].size).toBe(2);
        expect(newEntityAddr.chunkId).not.toBe(0);
        expect(storage["partialChunkIds"].size).toBe(1);
    });

    it("throws on duplicate allocation of entityId", () => {
        storage.allocate(42);
        expect(() => storage.allocate(42)).toThrow(/already exists/i);
    });

    /* ─── Deletion ──────────────────────────────────────────────────────── */

    it("deletes entity and manages chunk reuse correctly", () => {
        const addrA = storage.allocate(101);
        const addrB = storage.allocate(202);
        const addrC = storage.allocate(303);

        storage.delete(202);

        expect(storage["entities"].has(202)).toBe(false);

        // Confirm entity 303 moved to position previously occupied by 202
        const addrCUpdated = storage["entities"].get(303)!;
        expect(addrCUpdated.row).toBe(addrB.row);
        expect(addrCUpdated.chunkId).toBe(addrB.chunkId);

        const chunk = storage.getChunk(addrB.chunkId)!;
        expect(chunk.count).toBe(2);
    });

    it("removes empty chunks and recycles chunkIds", () => {
        const entityIds = Array.from(
            { length: Chunk.ENTITIES_PER_CHUNK },
            (_, i) => i
        );
        entityIds.forEach((id) => storage.allocate(id));

        const chunkId = storage["entities"].get(0)!.chunkId;
        expect(storage["chunks"].has(chunkId)).toBe(true);

        entityIds.forEach((id) => storage.delete(id));
        expect(storage["chunks"].has(chunkId)).toBe(false);
    });

    it("throws on deleting non-existing entityId", () => {
        expect(() => storage.delete(404)).toThrow(/not found/i);
    });

    /* ─── Chunk iteration ────────────────────────────────────────────────── */

    it("iterates correctly through chunks using forEachChunk", () => {
        for (let i = 0; i < 512; i++) storage.allocate(i); // Ensure at least 2 chunks

        const chunksVisited: number[] = [];

        storage.forEachChunk((chunk, chunkId) => {
            chunksVisited.push(chunkId);
            expect(chunk.count).toBeLessThanOrEqual(Chunk.ENTITIES_PER_CHUNK);
        });

        expect(chunksVisited.length).toBeGreaterThanOrEqual(2);
    });

    /* ─── Internal consistency ───────────────────────────────────────────── */

    it("maintains consistent partialChunkIds state", () => {
        const idA = storage.allocate(1);
        expect(storage["partialChunkIds"].has(idA.chunkId)).toBe(true);

        for (let i = 2; i <= Chunk.ENTITIES_PER_CHUNK; i++) {
            storage.allocate(i);
        }
        expect(storage["partialChunkIds"].has(idA.chunkId)).toBe(false);

        storage.delete(1);
        expect(storage["partialChunkIds"].has(idA.chunkId)).toBe(true);
    });

    /* ─── Robustness ────────────────────────────────────────────────────── */

    it("validates entityId on allocate/delete", () => {
        expect(() => storage.allocate(-1)).toThrow(/invalid entityId/i);
        expect(() => storage.delete(-1)).toThrow(/invalid entityId/i);
    });

    it("logs debug information correctly when DEBUG is true", () => {
        if (process.env.CLUSTER_ENGINE_DEBUG !== "true") return;

        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        storage.allocate(999);
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining("entityId: 999")
        );

        logSpy.mockRestore();
    });
});
