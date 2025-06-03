// little demo app to test on archetypes, chunks, and the engine
// this is simply drawing rectangles on screen.
// data is stored in a single chunk

import { Renderer } from "../../cluster/gl/Renderer";
import { RectData } from "../../cluster/gl/pipelines/rectData";
import { RectPipeline } from "../../cluster/gl/pipelines/rect";
import { Engine } from "../../cluster/core/Engine";
import { getArchetype } from "../ecs/archetype";
import {
    ComponentType,
    ComponentAssignmentMap,
    DESCRIPTORS,
} from "../ecs/components";
import { Storage } from "../ecs/storage";
import { IDPool } from "../tools/IDPool";

const renderer = Renderer.getInstance();

const rectPipeline = new RectPipeline(renderer, ["Position", "Size", "Color"]);

const engine = new Engine(60);

// 1. create a rectangle archetype
const rectangleArchetype = getArchetype([
    ComponentType.EntityId,
    ComponentType.Position,
    ComponentType.Size,
    ComponentType.Color,
    ComponentType.Velocity,
    ComponentType.PreviousPosition,
]);

// 2. create the rectangle component descriptors object
const rectangleDescriptors = [
    DESCRIPTORS[ComponentType.EntityId],
    DESCRIPTORS[ComponentType.Position],
    DESCRIPTORS[ComponentType.Size],
    DESCRIPTORS[ComponentType.Color],
    DESCRIPTORS[ComponentType.Velocity],
    DESCRIPTORS[ComponentType.PreviousPosition],
] as const;

// 3. create a sotrage of chunks
const storage = new Storage<typeof rectangleDescriptors>(rectangleArchetype);

const entityIdPool = new IDPool();
for (let i = 0; i < 256 * 12; i++) {
    const px = Math.random() * 100;
    const py = Math.random() * 100;
    const ppx = px;
    const ppy = py;
    const sx = 32;
    const sy = 32;
    const r = Math.random() * 255;
    const g = Math.random() * 255;
    const b = Math.random() * 255;
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

    const entityId = entityIdPool.acquire();

    storage.allocate(entityId, comps);
}

// 5. system to make the rectangles bouncing on screen
const updateSystem = {
    update: (dt: number) => {
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
    },
};

// 5. system to make the rectangles bouncing on screen

const rendererSystem = {
    // interpPos: Float32Array.from(chunk.views.Position), // for smooth movement - scratch
    interpPos: null as Float32Array | null,
    render: (alpha: number) => {
        // const start = window.performance.now();
        renderer.clear();
        storage.forEachChunk((chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            // at the first iteration initialize the scratch
            if (!rendererSystem.interpPos) {
                rendererSystem.interpPos = Float32Array.from(
                    chunk.views.PreviousPosition
                );
            }

            // use alpha to interpolate positions for smooth movement
            const cur = chunk.views.Position;
            const prev = chunk.views.PreviousPosition;

            for (let i = 0; i < count * 2; ++i) {
                rendererSystem.interpPos[i] =
                    prev[i] + (cur[i] - prev[i]) * alpha;
            }

            // rect data from subarrays
            const rectData: RectData = {
                positions: rendererSystem.interpPos.subarray(0, count * 2),
                sizes: chunk.views.Size.subarray(0, count * 2),
                colors: chunk.views.Color.subarray(0, count * 4),
            };

            rectPipeline.bind(renderer.gl);

            rectPipeline.draw(renderer.gl, rectData, count);
        });
        // const end = window.performance.now();
        // console.log((end - start).toFixed(3));
    },
};

export default () => {
    engine.addUpdateable(updateSystem);
    engine.addRenderable(rendererSystem);
    engine.start();
};
