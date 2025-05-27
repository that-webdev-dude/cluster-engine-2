/**
 * project/tests/chunk.spec.ts
 *
 * Comprehensive test-suite for the Chunk class.
 *
 * Adjust the import paths below so they point at the real source files
 * in your project structure.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---- adapt these imports to match your src tree ---------------------------
import { Chunk } from "../ecs/chunk";
import { getArchetype } from "../ecs/archetype";
import { ComponentType, DESCRIPTORS } from "../ecs/components";
// ---------------------------------------------------------------------------

/* Utilities --------------------------------------------------------------- */

/** Convenience that spawns a fresh Chunk containing Position & Velocity. */
function makePosVelChunk(): Chunk<
    readonly [
        (typeof DESCRIPTORS)[ComponentType.Position],
        (typeof DESCRIPTORS)[ComponentType.Velocity],
        (typeof DESCRIPTORS)[ComponentType.EntityId]
    ]
> {
    // NB: EntityId is injected automatically by getArchetype, but we
    // still need its descriptor for typing the views map.
    const archetype = getArchetype([
        ComponentType.Position,
        ComponentType.Velocity,
    ]);

    // The slice-as-const keeps the literal tuple type intact for the generic.
    const posVelDescriptors = [
        DESCRIPTORS[ComponentType.Position],
        DESCRIPTORS[ComponentType.Velocity],
        DESCRIPTORS[ComponentType.EntityId],
    ] as const;

    return new Chunk<typeof posVelDescriptors>(archetype);
}

/** Pulls a row out of the typed component views as plain JS objects. */
function readRow(chunk: ReturnType<typeof makePosVelChunk>, row: number) {
    const { Position, Velocity } = chunk.views;
    const pBase = row * 2;
    const vBase = row * 2;

    return {
        entity: chunk.entityIdColumn[row],
        position: [Position[pBase], Position[pBase + 1]],
        velocity: [Velocity[vBase], Velocity[vBase + 1]],
    };
}

/* Test-suite -------------------------------------------------------------- */

describe("Chunk", () => {
    let chunk: ReturnType<typeof makePosVelChunk>;

    beforeEach(() => {
        chunk = makePosVelChunk();
    });

    it("starts empty and exposes header metadata", () => {
        expect(chunk.capacity).toBe(Chunk.ENTITIES_PER_CHUNK);
        expect(chunk.count).toBe(0);
        expect(chunk.byteSize).toBe(
            Chunk.HEADER_BYTE_SIZE +
                Chunk.ENTITIES_PER_CHUNK * chunk["archetype"].byteStride
        );
    });

    it("allocates an entity, assigns defaults and the provided entityId", () => {
        const row = chunk.allocate(42);

        // Count incremented
        expect(chunk.count).toBe(1);
        expect(row).toBe(0);

        // Default component values are copied
        const snapshot = readRow(chunk, row);
        expect(snapshot.entity).toBe(42);
        expect(snapshot.position).toEqual([10, 11]);
        expect(snapshot.velocity).toEqual([20, 21]);
    });

    it("allows direct mutation via typed-array views", () => {
        const row = chunk.allocate(7);
        const { Position, Velocity } = chunk.views;
        const base = row * 2;

        Position[base] = 123;
        Position[base + 1] = 456;
        Velocity[base] = -1;
        Velocity[base + 1] = -2;

        const snapshot = readRow(chunk, row);
        expect(snapshot.position).toEqual([123, 456]);
        expect(snapshot.velocity).toEqual([-1, -2]);
    });

    it("throws when exceeding capacity", () => {
        // Fill chunk to capacity
        for (let i = 0; i < chunk.capacity; i++) chunk.allocate(i);

        expect(() => chunk.allocate(999)).toThrow(/Chunk is full/);
        expect(chunk.count).toBe(chunk.capacity);
    });

    it("delete swaps the last row into the removed slot and decrements count", () => {
        // Allocate three distinct rows
        const a = chunk.allocate(1); // row 0
        const b = chunk.allocate(2); // row 1
        const c = chunk.allocate(3); // row 2 (last)

        // Mutate row values so we can track them
        chunk.views.Position.set([100, 101], a * 2);
        chunk.views.Position.set([200, 201], b * 2);
        chunk.views.Position.set([300, 301], c * 2);

        // Spy on console.warn (the implementation logs a swap warning)
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Delete middle row (row 1)
        chunk.delete(b);

        // Count should now be 2
        expect(chunk.count).toBe(2);

        // Row 1 should now contain what used to be the last row
        const moved = readRow(chunk, 1);
        expect(moved.entity).toBe(3);
        expect(moved.position).toEqual([300, 301]);

        // Row 0 remains unchanged
        const first = readRow(chunk, 0);
        expect(first.entity).toBe(1);
        expect(first.position).toEqual([100, 101]);

        // console.warn was emitted
        expect(warnSpy).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it("getView returns strongly-typed arrays & rejects unknown descriptors", () => {
        const posView = chunk.getView<Float32Array>(
            DESCRIPTORS[ComponentType.Position]
        );
        expect(posView).toBeInstanceOf(Float32Array);
        expect(() => chunk.getView(DESCRIPTORS[ComponentType.Color])).toThrow(
            /not found/
        );
    });
});
