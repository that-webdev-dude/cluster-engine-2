import { describe, it, expect, beforeEach } from "vitest";
import { Chunk } from "../chunk";
import { Archetype } from "../archetype";
import type { ComponentDescriptor } from "../../types";

enum Component {
    Position,
    Velocity,
    Health,
    Tag,
}

// Register four descriptors at once
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

describe("Chunk ▶ multi-component", () => {
    let chunk: Chunk<typeof DESCS>;

    beforeEach(() => {
        // Archetype only includes Position, Velocity, Health
        const archetype = Archetype.create("multi", [
            Component.Position,
            Component.Velocity,
            Component.Health,
        ]);
        chunk = new Chunk(archetype);
    });

    it("populates defaults for all components on allocate()", () => {
        const idx = chunk.allocate();

        const pos = chunk.getView<Float32Array>(PosDesc);
        const vel = chunk.getView<Float32Array>(VelDesc);
        const hp = chunk.getView<Uint32Array>(HealthDesc);

        // Position default = [0,0]
        expect(pos[idx * 2 + 0]).toBe(0);
        expect(pos[idx * 2 + 1]).toBe(0);

        // Velocity default = [1,1]
        expect(vel[idx * 2 + 0]).toBe(1);
        expect(vel[idx * 2 + 1]).toBe(1);

        // Health default = [100]
        expect(hp[idx]).toBe(100);
    });

    it("lets you write & read back multiple components independently", () => {
        const idxA = chunk.allocate();
        const idxB = chunk.allocate();

        const pos = chunk.getView<Float32Array>(PosDesc);
        const hp = chunk.getView<Uint32Array>(HealthDesc);

        // Set distinct values
        pos[idxA * 2 + 0] = 5;
        pos[idxA * 2 + 1] = 6;
        hp[idxA] = 55;

        pos[idxB * 2 + 0] = 7;
        pos[idxB * 2 + 1] = 8;
        hp[idxB] = 77;

        // Ensure no bleed-over
        expect(pos[idxA * 2 + 0]).toBe(5);
        expect(pos[idxA * 2 + 1]).toBe(6);
        expect(hp[idxA]).toBe(55);

        expect(pos[idxB * 2 + 0]).toBe(7);
        expect(pos[idxB * 2 + 1]).toBe(8);
        expect(hp[idxB]).toBe(77);
    });
});

describe("Chunk ▶ alignment/padding edge case", () => {
    let chunk: Chunk<typeof DESCS>;

    beforeEach(() => {
        // Archetype includes only our Tag component with custom alignment
        const archetype = Archetype.create("aligned", [Component.Tag]);
        chunk = new Chunk(archetype);
    });

    it("ensures the view.byteOffset respects the descriptor.alignment", () => {
        const view = chunk.getView<Uint8Array>(TagDesc);

        // byteOffset must be a multiple of the alignment (16)
        expect(view.byteOffset % 16).toBe(0);

        // We can still allocate and see our default in-place
        const idx = chunk.allocate();
        expect(view[idx]).toBe(7);
    });
});

describe("Chunk ▶ error paths after dispose()", () => {
    let chunk: Chunk<typeof DESCS>;

    beforeEach(() => {
        const archetype = Archetype.create("throwy", [Component.Position]);
        chunk = new Chunk(archetype);
        chunk.allocate();
        chunk.dispose();
    });

    const methods: Array<[string, () => any]> = [
        ["count getter", () => chunk.count],
        ["byteCapacity getter", () => chunk.byteCapacity],
        ["full getter", () => chunk.full],
        ["formattedArchetype getter", () => chunk.formattedArchetype],
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
