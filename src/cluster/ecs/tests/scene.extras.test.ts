import { describe, it, expect, beforeEach } from "vitest";
import { Scene } from "../scene";
import { Archetype } from "../archetype";
import { CommandBuffer } from "../cmd";
import type { View } from "../scene";
import type { EntityId } from "../../types";

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

class TestSystem {
    createdId: EntityId | null = null;

    update(view: View, cmd: CommandBuffer) {
        // Create entity via command buffer
        cmd.create(archetype, {
            [Component.Position]: [42, 84],
            [Component.Health]: [77],
        });
    }
}

let scene: Scene;
let cmd: CommandBuffer;
let schema = Archetype.register(
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
let archetype = Archetype.create("cmdTest", schema);

describe("SceneV2 ▶ command buffer integration", () => {
    beforeEach(() => {
        scene = new Scene({ updateableSystems: [], renderableSystems: [] });
        cmd = new CommandBuffer(scene);
    });

    it("defers entity creation until flush is called", () => {
        expect(scene["entityMeta"].ids.length).toBe(0);

        cmd.create(archetype, {
            [Component.Position]: [1, 2],
            [Component.Health]: [55],
        });

        // Still zero entities before flush
        expect(scene["entityMeta"].ids.length).toBe(0);

        cmd.flush();

        expect(scene["entityMeta"].ids.length).toBe(1);

        const id = scene["entityMeta"].ids[0];
        const meta = scene["entityMeta"].get(id)!;

        const storage = scene["archetypes"].get(archetype.signature)!;
        const pos = storage
            .getChunk(meta.chunkId)!
            .getView<Float32Array>(PosDesc);
        const hp = storage
            .getChunk(meta.chunkId)!
            .getView<Uint32Array>(HealthDesc);

        expect(pos[meta.row * 2 + 0]).toBe(1);
        expect(pos[meta.row * 2 + 1]).toBe(2);
        expect(hp[meta.row]).toBe(55);
    });

    it("defers entity removal until flush is called", () => {
        const id = scene.createEntity(archetype, {
            [Component.Position]: [10, 20],
            [Component.Health]: [30],
        });

        expect(scene["entityMeta"].has(id)).toBe(true);

        cmd.remove(id);

        // Entity still exists before flush
        expect(scene["entityMeta"].has(id)).toBe(true);

        cmd.flush();

        // Entity should be gone
        expect(scene["entityMeta"].has(id)).toBe(false);
    });

    it("executes multiple commands in correct order", () => {
        const idToRemove = scene.createEntity(archetype, {
            [Component.Position]: [7, 8],
            [Component.Health]: [88],
        });

        cmd.remove(idToRemove);
        cmd.create(archetype, {
            [Component.Position]: [99, 100],
            [Component.Health]: [111],
        });

        // Before flush: 1 entity (original)
        expect(scene["entityMeta"].ids.length).toBe(1);

        cmd.flush();

        // After flush: should still be 1 entity (remove + create)
        expect(scene["entityMeta"].ids.length).toBe(1);

        const id = scene["entityMeta"].ids[0];
        const meta = scene["entityMeta"].get(id)!;

        const pos = scene["archetypes"]
            .get(archetype.signature)!
            .getChunk(meta.chunkId)!
            .getView<Float32Array>(PosDesc);

        expect(pos[meta.row * 2 + 0]).toBe(99);
        expect(pos[meta.row * 2 + 1]).toBe(100);
    });

    it("flush clears the command buffer", () => {
        cmd.create(archetype, {
            [Component.Position]: [1, 2],
            [Component.Health]: [3],
        });

        expect((cmd as any)["commands"].length).toBe(1);
        cmd.flush();
        expect((cmd as any)["commands"].length).toBe(0);
    });
});
