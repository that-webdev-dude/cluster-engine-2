// src/cluster/ecs/tests/chunk.v2.extras.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { ChunkV2 } from "../chunk";
import { Archetype } from "../archetype";

enum Component {
    Position,
    Velocity,
    Health,
    Tag,
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
    },
    {
        type: Component.Tag,
        name: "Tag",
        count: 1,
        buffer: Uint8Array,
        alignment: 16,
        default: [7],
    }
);

const [PosDesc, VelDesc, HealthDesc, TagDesc] = DESCS;

describe("ChunkV2 ▶ multi-component support", () => {
    let chunk: ChunkV2<typeof DESCS>;
    beforeEach(() => {
        const archetype = Archetype.create("multi", [
            Component.Position,
            Component.Velocity,
            Component.Health,
        ]);
        chunk = new ChunkV2(archetype);
    });

    it("populates defaults for all components on allocate()", () => {
        const { row } = chunk.allocate();

        const pos = chunk.getView<Float32Array>(PosDesc);
        const vel = chunk.getView<Float32Array>(VelDesc);
        const hp = chunk.getView<Uint32Array>(HealthDesc);

        // Position default = [0,0]
        expect(pos[row * 2 + 0]).toBe(0);
        expect(pos[row * 2 + 1]).toBe(0);

        // Velocity default = [1,1]
        expect(vel[row * 2 + 0]).toBe(1);
        expect(vel[row * 2 + 1]).toBe(1);

        // Health default = [100]
        expect(hp[row]).toBe(100);
    });

    it("lets you write & read back multiple components independently", () => {
        const { row: A } = chunk.allocate();
        const { row: B } = chunk.allocate();

        const pos = chunk.getView<Float32Array>(PosDesc);
        const hp = chunk.getView<Uint32Array>(HealthDesc);

        pos[A * 2 + 0] = 5;
        pos[A * 2 + 1] = 6;
        hp[A] = 55;

        pos[B * 2 + 0] = 7;
        pos[B * 2 + 1] = 8;
        hp[B] = 77;

        expect(pos[A * 2 + 0]).toBe(5);
        expect(pos[A * 2 + 1]).toBe(6);
        expect(hp[A]).toBe(55);

        expect(pos[B * 2 + 0]).toBe(7);
        expect(pos[B * 2 + 1]).toBe(8);
        expect(hp[B]).toBe(77);
    });
});

describe("ChunkV2 ▶ alignment/padding edge case", () => {
    let chunk: ChunkV2<typeof DESCS>;

    beforeEach(() => {
        const archetype = Archetype.create("aligned", [Component.Tag]);
        chunk = new ChunkV2(archetype);
    });

    it("ensures view.byteOffset respects descriptor.alignment", () => {
        const view = chunk.getView<Uint8Array>(TagDesc);
        expect(view.byteOffset % 16).toBe(0);

        // still works on allocate
        const { row } = chunk.allocate();
        expect(view[row]).toBe(7);
    });
});

describe("ChunkV2 ▶ error paths after dispose()", () => {
    let chunk: ChunkV2<typeof DESCS>;

    beforeEach(() => {
        const archetype = Archetype.create("throwy", [Component.Position]);
        chunk = new ChunkV2(archetype);
        chunk.allocate();
        chunk.dispose();
    });

    const methods: Array<[string, () => any]> = [
        ["count getter", () => chunk.count],
        ["byteCapacity getter", () => chunk.byteCapacity],
        ["full getter", () => chunk.full],
        ["formattedArchetype getter", () => chunk.formattedArchetype],
        ["getGeneration()", () => chunk.getGeneration(0)],
        ["allocate()", () => chunk.allocate()],
        ["delete(0)", () => chunk.delete(0)],
        ["getView()", () => chunk.getView(PosDesc)],
    ];

    for (const [name, fn] of methods) {
        it(`throws when calling ${name}`, () => {
            expect(fn).toThrow(/destroyed/);
        });
    }
});
