import { ComponentDescriptor, ComponentValueMap } from "./types";
import { RectPipeline } from "../cluster/gl/pipelines/rect";
import { RectData } from "../cluster/gl/pipelines/rectData";
import { Renderer } from "../cluster/gl/Renderer";
import { Engine } from "../cluster/core/Engine";
import { Archetype } from "./ecs/archetype";
import { CommandBuffer } from "./ecs/cmd";
import { World, WorldView } from "./ecs/world";
import { UpdateableSystem, RenderableSystem } from "./ecs/system";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

// 5. system to make the rectangles bouncing on screen
class MovementSystem implements UpdateableSystem {
    update(view: WorldView, cmd: CommandBuffer, dt: number) {
        const renderer = Renderer.getInstance();
        view.forEachChunkWith(
            [
                Component.Position,
                Component.Velocity,
                Component.Size,
                Component.PreviousPosition,
            ],
            (chunk) => {
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
            }
        );
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

    render(view: WorldView, alpha: number) {
        view.forEachChunkWith(
            [
                Component.Position,
                Component.Color,
                Component.Size,
                Component.PreviousPosition,
            ],
            (chunk) => {
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
            }
        );
    }
}

// 6. create the world
const world = new World({
    updateableSystems: [new MovementSystem()],
    renderableSystems: [new RendererSystem()],
});

enum Component {
    Position,
    Velocity,
    Radius,
    Size,
    Color,
    PreviousPosition,
}

const DESCRIPTORS: readonly ComponentDescriptor[] = [
    {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [10, 11],
    },
    {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [20, 21],
    },
    {
        type: Component.Radius,
        name: "Radius",
        count: 1,
        buffer: Float32Array,
        default: [1],
    },
    {
        type: Component.Size,
        name: "Size",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
    },
    {
        type: Component.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255],
    },
    {
        type: Component.PreviousPosition,
        name: "PreviousPosition",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
] as const;
Archetype.register(...(DESCRIPTORS as ComponentDescriptor[]));

// 1. create a rectangle archetype
const rectangleArchetype = Archetype.create(
    Component.Position,
    Component.Size,
    Component.Color,
    Component.Velocity,
    Component.PreviousPosition
);

// 2. create an obstacle archetype (red rectangle, no velocity)
const obstacleArchetype = Archetype.create(
    Component.Position,
    Component.Size,
    Component.Color,
    Component.PreviousPosition
);

// Add moving rectangles
for (let i = 0; i < 256 * 4; i++) {
    const px = Math.random() * 100;
    const py = Math.random() * 100;
    const ppx = px;
    const ppy = py;
    const sx = 2;
    const sy = 2;
    const r = 255;
    const g = 255;
    const b = 255;
    const a = 255;
    const vx = (Math.random() - 0.5) * 200;
    const vy = (Math.random() - 0.5) * 200;

    const comps: ComponentValueMap = {
        [Component.Position]: [px, py],
        [Component.Size]: [sx, sy],
        [Component.Color]: [r, g, b, a],
        [Component.Velocity]: [vx, vy],
        [Component.PreviousPosition]: [ppx, ppy],
    };

    world.createEntity(rectangleArchetype, comps);
}

// Add a static red obstacle rectangle
const obstacleComps: ComponentValueMap = {
    [Component.Position]: [50, 50],
    [Component.Size]: [10, 10],
    [Component.Color]: [255, 0, 0, 255], // Red
    [Component.PreviousPosition]: [50, 50],
};

world.createEntity(obstacleArchetype, obstacleComps);

world.initialize();

export default () => {
    const engine = new Engine(60);
    engine.addUpdateable(world);
    engine.addRenderable(world);
    engine.addCallback(world);
    engine.start();
    // setTimeout(() => {
    //     engine.stop();
    // }, 100);
};
