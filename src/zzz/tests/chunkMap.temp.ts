// /**
//  * project/tests/chunkMap.spec.ts
//  *
//  * Comprehensive test-suite for the ChunkMap class.
//  */

// import { describe, it, expect, beforeEach, vi } from "vitest";

// // ─── adjust these to match your src tree ────────────────────────────────────
// import { ChunkMap, Chunk } from "../ecs/chunk";
// import { getArchetype } from "../ecs/archetype";
// import { ComponentType, DESCRIPTORS } from "../ecs/components";
// // ────────────────────────────────────────────────────────────────────────────

// /* ── Helpers ─────────────────────────────────────────────────────────────── */

// const posVelDescriptors = [
//     DESCRIPTORS[ComponentType.Position],
//     DESCRIPTORS[ComponentType.Velocity],
//     DESCRIPTORS[ComponentType.EntityId], // present implicitly but needed for typing
// ] as const;

// type PosVelChunk = Chunk<typeof posVelDescriptors>;
// type PosVelMap = ChunkMap<typeof posVelDescriptors>;

// /** Fresh ChunkMap with Position & Velocity archetype. */
// function makePosVelMap(): PosVelMap {
//     const archetype = getArchetype([
//         ComponentType.Position,
//         ComponentType.Velocity,
//     ]);
//     return new ChunkMap<typeof posVelDescriptors>(archetype);
// }

// /** Returns a JS snapshot `{entity, position:[x,y], chunkId, row}` */
// function snapshot(map: PosVelMap, entityId: number) {
//     const addr = map.getEntityAddress(entityId);
//     if (!addr) throw new Error("entity not found");
//     const chunk = map.getChunk(+addr.chunkId) as PosVelChunk;
//     const { Position } = chunk.views;
//     const base = addr.row * 2;
//     return {
//         entity: entityId,
//         chunkId: +addr.chunkId,
//         row: addr.row,
//         position: [Position[base], Position[base + 1]],
//     };
// }

// /* ── Suite ───────────────────────────────────────────────────────────────── */

// describe("ChunkMap", () => {
//     let cmap: PosVelMap;

//     beforeEach(() => {
//         cmap = makePosVelMap();
//     });

//     /* ── Allocation basics ── */

//     it("starts empty", () => {
//         expect(cmap.getChunk(0)).toBeUndefined();
//         expect(cmap.entityAddress.size).toBe(0);
//     });

//     it("allocates first entity into chunk 0 row 0", () => {
//         const loc = cmap.allocate(42);
//         expect(loc).toEqual({ chunkId: 0, row: 0 });
//         expect(cmap.entityAddress.get(42)).toEqual(loc);
//         expect(snapshot(cmap, 42).position).toEqual([10, 11]); // default copy
//     });

//     /* ── Capacity spill-over ── */

//     it("fills a chunk to capacity then spills into a new chunk", () => {
//         const cap = Chunk.ENTITIES_PER_CHUNK;

//         // fill first chunk
//         for (let i = 0; i < cap; i++) cmap.allocate(i);

//         expect(cmap.getChunk(0)!.count).toBe(cap);

//         // next allocation should land in chunk 1 row 0
//         const loc = cmap.allocate(999);
//         expect(loc).toEqual({ chunkId: 1, row: 0 });
//         expect(cmap.getChunk(1)!.count).toBe(1);
//     });

//     /* ── Duplicate ID guard (optional) ── */

//     it("rejects allocating the same entity twice", () => {
//         cmap.allocate(1);
//         // ⚠ may fail if you didn't add a duplicate-ID guard
//         expect(() => cmap.allocate(1)).toThrow(/already/i);
//     });

//     /* ── Delete: row-swap bookkeeping ── */

//     it("delete updates entityAddress for the swapped last row", () => {
//         // allocate 3 so we have a middle row to delete
//         const a = cmap.allocate(11); // row 0
//         const b = cmap.allocate(22); // row 1  <- will delete
//         const c = cmap.allocate(33); // row 2 (last)

//         // mutate positions so we can track who moved
//         const chunk0 = cmap.getChunk(0)!;
//         chunk0.views.Position.set([100, 101], a.row * 2);
//         chunk0.views.Position.set([200, 201], b.row * 2);
//         chunk0.views.Position.set([300, 301], c.row * 2);

//         // spy on warn
//         const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

//         cmap.delete(22); // delete entityId 22 (row 1)

//         // entity 22 gone
//         expect(cmap.entityAddress.has(22)).toBe(false);

//         // entity 33 now says row 1
//         expect(cmap.entityAddress.get(33)).toEqual({ chunkId: 0, row: 1 });
//         expect(snapshot(cmap, 33).position).toEqual([300, 301]);

//         warnSpy.mockRestore();
//     });

//     /* ── Delete last row (no swap) ── */

//     it("delete last row leaves other addresses untouched", () => {
//         const e1 = cmap.allocate(50); // row 0
//         const e2 = cmap.allocate(60); // row 1 (last)

//         cmap.delete(60);

//         expect(cmap.entityAddress.has(60)).toBe(false);
//         expect(cmap.entityAddress.get(50)).toEqual({ chunkId: 0, row: 0 });
//         expect(cmap.getChunk(0)!.count).toBe(1);
//     });

//     /* ── entityId 0 nullish-coalescing bug ── */

//     it("correctly tracks entityId 0 when it is swapped", () => {
//         const r0 = cmap.allocate(0); // entityId 0 !
//         cmap.allocate(1);
//         cmap.allocate(2); // last row

//         // delete row 0 so entityId 2 will swap into row 0
//         cmap.delete(0);

//         // ⚠ may fail if you still use `movedEntity && …`
//         expect(cmap.entityAddress.get(2)).toEqual({ chunkId: 0, row: r0.row });
//     });

//     /* ── deleteChunk & sparse holes ── */

//     it("deleteChunk removes all its entity addresses and leaves a hole that findIndex skips", () => {
//         // fill first chunk
//         for (let i = 0; i < Chunk.ENTITIES_PER_CHUNK; i++)
//             cmap.allocate(i + 100);

//         // create second chunk and add a few entities
//         for (let i = 0; i < 5; i++) cmap.allocate(i + 200);

//         expect(cmap.getChunk(1)!.count).toBe(5);

//         // delete chunk 0
//         cmap.deleteChunk(0);

//         // every 100-199 id should be gone
//         for (let id = 100; id < 100 + Chunk.ENTITIES_PER_CHUNK; id++) {
//             expect(cmap.entityAddress.has(id)).toBe(false);
//         }

//         // allocate again → should reuse chunk 1 (id 1), not crash on undefined at 0
//         const loc = cmap.allocate(9999);
//         expect(loc.chunkId).toBe(1);
//     });
// });
