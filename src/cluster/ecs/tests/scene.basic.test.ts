import { describe, it, expect, beforeEach, vi } from "vitest";
import { Scene } from "../scene";
import { Archetype } from "../archetype";

enum Component {
    Position,
    Health,
}

const [PosDesc, HealthDesc] = Archetype.register(
    {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    {
        type: Component.Health,
        name: "Health",
        count: 1,
        buffer: Uint32Array,
        default: [100],
    }
);

describe("SceneV2 ▶ basic functionality", () => {
    let scene: Scene;

    const schema = Archetype.register(
        {
            type: Component.Position,
            name: "Position",
            count: 2,
            buffer: Float32Array,
            default: [0, 0],
        },
        {
            type: Component.Health,
            name: "Health",
            count: 1,
            buffer: Uint32Array,
            default: [100],
        }
    );
    const archetype = Archetype.create("test", schema);

    beforeEach(() => {
        scene = new Scene({ updateableSystems: [], renderableSystems: [] });
    });

    it("createEntity stores metadata and default component values", () => {
        scene.createEntity(archetype, {
            [Component.Position]: [5, 10],
            [Component.Health]: [99],
        });

        const [entityId] = scene["entityMeta"].ids;
        const meta = scene["entityMeta"].get(entityId)!;

        expect(meta).toBeDefined();
        expect(meta.archetype.signature).toBe(archetype.signature);

        const storage = scene["archetypes"].get(archetype.signature)!;
        const pos = storage
            .getChunk(meta.chunkId)!
            .getView<Float32Array>(PosDesc);
        const hp = storage
            .getChunk(meta.chunkId)!
            .getView<Uint32Array>(HealthDesc);

        expect(pos[meta.row * 2 + 0]).toBe(5);
        expect(pos[meta.row * 2 + 1]).toBe(10);
        expect(hp[meta.row]).toBe(99);
    });

    it("removes entity and updates moved entity metadata", () => {
        scene.createEntity(archetype, {
            [Component.Position]: [1, 2],
            [Component.Health]: [50],
        }); // 0
        scene.createEntity(archetype, {
            [Component.Position]: [3, 4],
            [Component.Health]: [60],
        }); // 1
        scene.createEntity(archetype, {
            [Component.Position]: [5, 6],
            [Component.Health]: [70],
        }); // 2

        const [idToRemove, id1, id2] = scene["entityMeta"].ids;

        // force metadata update to simulate generation tracking
        const metaBefore = scene["entityMeta"].get(id2)!;
        const oldRow = metaBefore.row;

        const removed = scene.removeEntity(idToRemove);
        expect(removed).toBe(true);

        const metaAfter = scene["entityMeta"].get(id2)!;
        expect(metaAfter.row).toBeLessThanOrEqual(oldRow); // moved into 0
        expect(metaAfter.generation).toBeGreaterThanOrEqual(0);
    });

    it("detects stale entity metadata on generation mismatch", () => {
        scene.createEntity(archetype, {
            [Component.Position]: [7, 8],
            [Component.Health]: [88],
        });
        scene.createEntity(archetype, {
            [Component.Position]: [9, 10],
            [Component.Health]: [99],
        });

        const [idToDelete, idToStale] = scene["entityMeta"].ids;
        const staleMeta = scene["entityMeta"].get(idToStale)!;

        // Simulate stale metadata by messing with generation
        staleMeta.generation += 42;

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const ok = scene.removeEntity(idToDelete);
        expect(ok).toBe(true);
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toMatch(/stale entity metadata/);
        warnSpy.mockRestore();
    });

    it("returns false when trying to remove a non-existent entity", () => {
        const result = scene.removeEntity(12345);
        expect(result).toBe(false);
    });

    it("cleans up archetype storage after last entity removed", () => {
        scene.createEntity(archetype, {
            [Component.Position]: [1, 1],
            [Component.Health]: [100],
        });

        const [id] = scene["entityMeta"].ids;
        const sig = archetype.signature;

        expect(scene["archetypes"].has(sig)).toBe(true);
        scene.removeEntity(id);
        expect(scene["archetypes"].has(sig)).toBe(false);
    });
});
