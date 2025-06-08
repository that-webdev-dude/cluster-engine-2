/**
 * project/tests/chunk.spec.ts
 *
 * Comprehensive test-suite for the Chunk class.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Chunk } from "../ecs/chunk";
import { Archetype } from "../ecs/archetypeV2";
import { ComponentType, DESCRIPTORS } from "../ecs/components";

/* Helpers ────────────────────────────────────────────────────────────────── */

/** Produces a fresh Position-Velocity chunk every time. */
function makePosVelChunk() {
    const archetype = Archetype.create(
        ComponentType.Position,
        ComponentType.Velocity
    );

    const tuple = [
        DESCRIPTORS[ComponentType.Position],
        DESCRIPTORS[ComponentType.Velocity],
        DESCRIPTORS[ComponentType.EntityId], // always present
    ] as const;

    return new Chunk<typeof tuple>(archetype);
}

/** Extracts a row as plain JS values (easier to assert on). */
function snapshotRow(chunk: ReturnType<typeof makePosVelChunk>, row: number) {
    const { Position, Velocity } = chunk.views;
    const pBase = row * 2;
    const vBase = row * 2;
    return {
        id: chunk.entityIdView[row],
        pos: [Position[pBase], Position[pBase + 1]],
        vel: [Velocity[vBase], Velocity[vBase + 1]],
    };
}

/* Tests ───────────────────────────────────────────────────────────────────── */

describe("Chunk (rev 2025-05-31)", () => {
    let chunk: ReturnType<typeof makePosVelChunk>;

    beforeEach(() => {
        chunk = makePosVelChunk();
    });

    it("starts empty, exposes capacity & byteSize and is frozen", () => {
        expect(chunk.count).toBe(0);
        expect(chunk.capacity).toBe(Chunk.ENTITIES_PER_CHUNK);
        expect(chunk.full).toBe(false);
        expect(chunk.byteSize).toBe(
            Chunk.HEADER_BYTE_SIZE +
                Chunk.ENTITIES_PER_CHUNK * chunk["archetype"].byteStride
        );

        // Implementation now freezes the `views` object itself
        expect(Object.isFrozen(chunk.views)).toBe(true);
    });

    /* ───── allocate ──────────────────────────────────────────────────────── */

    it("allocates entities, stamps defaults & entity id", () => {
        const row = chunk.allocate(77);

        expect(row).toBe(0);
        expect(chunk.count).toBe(1);

        const snap = snapshotRow(chunk, 0);
        expect(snap.id).toBe(77);
        expect(snap.pos).toEqual([10, 11]);
        expect(snap.vel).toEqual([20, 21]);
    });

    it("indicates “full” once capacity reached and further allocation fails", () => {
        for (let i = 0; i < chunk.capacity; i++) chunk.allocate(i);
        expect(chunk.full).toBe(true);
        expect(() => chunk.allocate(999)).toThrow(/full/i);
        expect(chunk.count).toBe(chunk.capacity);
    });

    /* ───── delete ───────────────────────────────────────────────────────── */

    it("delete on last row shrinks count, returns undefined", () => {
        const r0 = chunk.allocate(1);
        expect(r0).toBe(0);
        const moved = chunk.delete(r0);
        expect(moved).toBeUndefined();
        expect(chunk.count).toBe(0);
    });

    it("delete in middle returns movedEntityId and swaps last row → hole", () => {
        const a = chunk.allocate(10); // row 0
        const b = chunk.allocate(20); // row 1
        const c = chunk.allocate(30); // row 2 (last)

        // make row values obvious
        chunk.views.Position.set([100, 101], a * 2);
        chunk.views.Position.set([200, 201], b * 2);
        chunk.views.Position.set([300, 301], c * 2);

        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const moved = chunk.delete(b);
        expect(moved).toBe(30); // id of entity previously in last row
        expect(chunk.count).toBe(2);

        const row1 = snapshotRow(chunk, 1); // row 1 now holds entity 30
        expect(row1.id).toBe(30);
        expect(row1.pos).toEqual([300, 301]);

        const row0 = snapshotRow(chunk, 0);
        expect(row0.id).toBe(10);

        if (process.env.CLUSTER_ENGINE_DEBUG === "true") {
            expect(warn).toHaveBeenCalled(); // Debug mode → expect a warning
        } else {
            expect(warn).not.toHaveBeenCalled(); // Normal mode → no warning emitted
        }
        warn.mockRestore();
    });

    it("delete on out-of-range or empty chunk returns undefined and keeps count", () => {
        // out-of-range on empty chunk
        expect(chunk.delete(5)).toBeUndefined();
        expect(chunk.count).toBe(0);

        // after one allocation
        chunk.allocate(123);
        expect(chunk.delete(999)).toBeUndefined();
        expect(chunk.count).toBe(1);
    });

    /* ───── getView safety ──────────────────────────────────────────────── */

    it("getView returns correct typed-array and rejects unknown", () => {
        const pv = chunk.getView<Float32Array>(
            DESCRIPTORS[ComponentType.Position]
        );
        expect(pv).toBeInstanceOf(Float32Array);
        expect(() => chunk.getView(DESCRIPTORS[ComponentType.Color])).toThrow(
            /not found/i
        );
    });

    /* ───── dispose / assertAlive ───────────────────────────────────────── */

    it("dispose zeros header, nulls buffers in DEBUG mode, and further API calls throw", () => {
        // allocate something so count becomes >0
        chunk.allocate(1);
        expect(chunk.count).toBe(1);

        chunk.dispose();

        // after dispose every public accessor/mutator should error
        const throws = (fn: () => unknown) => expect(fn).toThrow(/destroyed/i);

        throws(() => chunk.count);
        throws(() => chunk.allocate(99));
        throws(() => chunk.full);
        throws(() => chunk.delete(0));

        // double-dispose is a NO-OP
        expect(() => chunk.dispose()).not.toThrow();
    });
});
