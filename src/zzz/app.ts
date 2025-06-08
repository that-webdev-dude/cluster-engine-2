import { Renderer } from "../cluster/gl/Renderer";
import { RectData } from "../cluster/gl/pipelines/rectData";
import { RectPipeline } from "../cluster/gl/pipelines/rect";
import { Engine } from "../cluster/core/Engine";
import { Archetype } from "./ecs/archetype";
import {
    ComponentType,
    ComponentAssignmentMap,
    DESCRIPTORS,
    ComponentDescriptor,
} from "./ecs/components";
import { Chunk } from "./ecs/chunk";
import { Storage } from "./ecs/storage";
import { EntityPool, EntityMetaSet, EntityId } from "./ecs/entity";
import { CommandBuffer } from "./ecs/cmd";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

/**
 * Abstract base class for systems that can be updated each frame.
 *
 * Classes extending `UpdateableSystem` must implement the `update` method,
 * which is called with the elapsed time since the last update.
 */
export abstract class UpdateableSystem {
    abstract update(world: World, dt: number): void;
}

/**
 * Abstract base class for systems that can be rendered each frame.
 *
 * Classes extending `RenderableSystem` must implement the `render` method,
 * which is called with an interpolation alpha value.
 */
export abstract class RenderableSystem {
    abstract render(world: World, alpha: number): void;
}

class WorldView {
    constructor(
        private readonly archetypeMap: Map<
            number,
            Storage<ComponentDescriptor[]>
        >
    ) {}

    // forEachChunkWith(...components: ComponentType[]) {

    // }
}

class World {
    private updateableSystems: UpdateableSystem[] = [];
    private renderableSystems: RenderableSystem[] = [];
    private cmd: CommandBuffer = new CommandBuffer();
    private entities: EntityMetaSet = new EntityMetaSet();

    readonly archetypes: Map<number, Storage<ComponentDescriptor[]>> =
        new Map();

    constructor(options: {
        updateableSystems: UpdateableSystem[];
        renderableSystems: RenderableSystem[];
    }) {
        this.updateableSystems = options.updateableSystems;
        this.renderableSystems = options.renderableSystems;
    }

    createEntity(archetype: Archetype, comps: ComponentAssignmentMap) {
        let storage = this.archetypes.get(archetype.signature);
        if (storage === undefined) {
            const descriptors = archetype.types.map((c) => DESCRIPTORS[c]); // archetype.types includes EntityId type so it's fine
            this.archetypes.set(
                archetype.signature,
                new Storage<typeof descriptors>(archetype)
            );
            storage = this.archetypes.get(archetype.signature)!; // just created one
        }

        const entityId = EntityPool.acquire();

        // ⚠️ this should be done via cmd
        const { chunkId, row } = storage.allocate(entityId, comps);

        this.entities.insert({
            archetype,
            entityId,
            chunkId,
            row,
        });
    }

    removeEntity(entityId: EntityId): boolean {
        const meta = this.entities.get(entityId);
        if (meta === undefined) {
            if (DEBUG)
                throw new Error(
                    `World.removeEntity: entityId ${entityId} does not exists in the world`
                );
            return false;
        }

        const { archetype } = meta;
        const storage = this.archetypes.get(archetype.signature);
        if (storage === undefined) {
            if (DEBUG)
                throw new Error(
                    `World.removeEntity: entityId ${entityId} does not exists in the world`
                );
            return false;
        }

        // ⚠️ this should be done via cmd
        storage.delete(entityId);

        this.entities.remove(entityId);

        EntityPool.release(entityId);

        return true;
    }

    // ⚠️ these methods should be part of a Game class owning the world instance
    update(dt: number) {
        this.updateableSystems.forEach((system) => system.update(this, dt));
    }

    render(alpha: number) {
        this.renderableSystems.forEach((system) => system.render(this, alpha));
    }

    done() {
        // console.log("events and flush");
    }
}

const engine = new Engine(60);

// 5. system to make the rectangles bouncing on screen
class MovementSystem implements UpdateableSystem {
    update(world: World, dt: number) {
        const renderer = Renderer.getInstance();

        const storage = world.archetypes.get(rectangleArchetype.signature);
        if (storage === undefined) return;

        // const start = window.performance.now();
        storage.forEachChunk((chunk) => {
            for (let i = 0; i < chunk.count; i++) {
                const vx = chunk.views.Velocity[i * 2];
                const vy = chunk.views.Velocity[i * 2 + 1];

                // Store previous position for smooth movement
                chunk.views.PreviousPosition[i * 2] =
                    chunk.views.Position[i * 2];
                chunk.views.PreviousPosition[i * 2 + 1] =
                    chunk.views.Position[i * 2 + 1];

                // Update position
                chunk.views.Position[i * 2] += vx * dt;
                chunk.views.Position[i * 2 + 1] += vy * dt;

                // Bounce off walls
                const x = chunk.views.Position[i * 2];
                const y = chunk.views.Position[i * 2 + 1];

                if (
                    x < 0 ||
                    x + chunk.views.Size[i * 2] > renderer.worldWidth
                ) {
                    chunk.views.Velocity[i * 2] *= -1; // Reverse horizontal velocity
                }
                if (
                    y < 0 ||
                    y + chunk.views.Size[i * 2 + 1] > renderer.worldHeight
                ) {
                    chunk.views.Velocity[i * 2 + 1] *= -1; // Reverse vertical velocity
                }
            }
        });
        // const end = window.performance.now();
        // console.log((end - start).toFixed(3));
    }
}

// 5. system to make the rectangles bouncing on screen
class RendererSystem implements RenderableSystem {
    private interpPos = null as Float32Array | null;
    private renderer = Renderer.getInstance();
    private rectPipeline = new RectPipeline(this.renderer, [
        "Position",
        "Size",
        "Color",
    ]);

    render(world: World, alpha: number) {
        const storage = world.archetypes.get(rectangleArchetype.signature);
        if (storage === undefined) return;

        this.renderer.clear();
        storage.forEachChunk((chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            // at the first iteration initialize the scratch
            if (!this.interpPos) {
                this.interpPos = Float32Array.from(
                    chunk.views.PreviousPosition
                );
            }

            // use alpha to interpolate positions for smooth movement
            const cur = chunk.views.Position;
            const prev = chunk.views.PreviousPosition;

            for (let i = 0; i < count * 2; ++i) {
                this.interpPos[i] = prev[i] + (cur[i] - prev[i]) * alpha;
            }

            // rect data from subarrays
            const rectData: RectData = {
                positions: this.interpPos.subarray(0, count * 2),
                sizes: chunk.views.Size.subarray(0, count * 2),
                colors: chunk.views.Color.subarray(0, count * 4),
            };

            const { gl } = this.renderer;

            this.rectPipeline.bind(gl);

            this.rectPipeline.draw(gl, rectData, count);
        });
    }
}

// 6. create the world
const world = new World({
    updateableSystems: [new MovementSystem()],
    renderableSystems: [new RendererSystem()],
});

// 1. create a rectangle archetype
const rectangleArchetype = Archetype.create(
    ComponentType.EntityId,
    ComponentType.Position,
    ComponentType.Size,
    ComponentType.Color,
    ComponentType.Velocity,
    ComponentType.PreviousPosition
);

for (let i = 0; i < 10; i++) {
    const px = Math.random() * 100;
    const py = Math.random() * 100;
    const ppx = px;
    const ppy = py;
    const sx = 2;
    const sy = 2;
    const r = Math.random() * 256;
    const g = Math.random() * 256;
    const b = Math.random() * 256;
    const a = 1;
    const vx = (Math.random() - 0.5) * 200;
    const vy = (Math.random() - 0.5) * 200;

    const comps: ComponentAssignmentMap = {
        [ComponentType.Position]: [px, py],
        [ComponentType.Size]: [sx, sy],
        [ComponentType.Color]: [r, g, b, a],
        [ComponentType.Velocity]: [vx, vy],
        [ComponentType.PreviousPosition]: [ppx, ppy],
    };

    world.createEntity(rectangleArchetype, comps);
}

export default () => {
    engine.addUpdateable(world);
    engine.addRenderable(world);
    engine.addCallback(world);
    engine.start();
};
