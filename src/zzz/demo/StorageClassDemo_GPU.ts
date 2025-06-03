// little demo app to test on archetypes, chunks, and the engine
// this is simply drawing rectangles on screen.
// data is stored in a single chunk

import { Renderer } from "../../cluster/gl/Renderer";
import { RectData } from "../../cluster/gl/pipelines/rectData";
import { RectPipeline } from "../../cluster/gl/pipelines/rect";
import { Engine } from "../../cluster/core/Engine";
import { getArchetype } from "../ecs/archetype";
import { ComponentType, DESCRIPTORS } from "../ecs/components";
import { Chunk } from "../ecs/chunk";

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

// 3. create a chunk with the rectangle archetype
const chunk = new Chunk<typeof rectangleDescriptors>(rectangleArchetype);

// 4. add some rectangles to the chunk
for (let i = 0; i < 256; i++) {
    const entityId = i + 1; // Entity IDs start from 1

    chunk.allocate(entityId);

    chunk.views.Position[i * 2] = Math.random() * renderer.worldWidth;
    chunk.views.Position[i * 2 + 1] = Math.random() * renderer.worldHeight;

    chunk.views.PreviousPosition[i * 2] = chunk.views.Position[i * 2];
    chunk.views.PreviousPosition[i * 2 + 1] = chunk.views.Position[i * 2 + 1];

    chunk.views.Size[i * 2] = Math.random() * 50 + 20;
    chunk.views.Size[i * 2 + 1] = Math.random() * 50 + 20;

    chunk.views.Color[i * 4] = Math.random() * 255;
    chunk.views.Color[i * 4 + 1] = Math.random() * 255;
    chunk.views.Color[i * 4 + 2] = Math.random() * 255;
    chunk.views.Color[i * 4 + 3] = 1.0;

    chunk.views.Velocity[i * 2] = (Math.random() - 0.5) * 200; // Random horizontal velocity
    chunk.views.Velocity[i * 2 + 1] = (Math.random() - 0.5) * 200; // Random vertical velocity
}

// 5. system to make the rectangles bouncing on screen
const updateSystem = {
    update: (deltaTime: number) => {
        for (let i = 0; i < chunk.count; i++) {
            const vx = chunk.views.Velocity[i * 2];
            const vy = chunk.views.Velocity[i * 2 + 1];

            // Store previous position for smooth movement
            chunk.views.PreviousPosition[i * 2] = chunk.views.Position[i * 2];
            chunk.views.PreviousPosition[i * 2 + 1] =
                chunk.views.Position[i * 2 + 1];

            // Update position
            chunk.views.Position[i * 2] += vx * deltaTime;
            chunk.views.Position[i * 2 + 1] += vy * deltaTime;

            // Bounce off walls
            const x = chunk.views.Position[i * 2];
            const y = chunk.views.Position[i * 2 + 1];

            if (x < 0 || x + chunk.views.Size[i * 2] > renderer.worldWidth) {
                chunk.views.Velocity[i * 2] *= -1; // Reverse horizontal velocity
            }
            if (
                y < 0 ||
                y + chunk.views.Size[i * 2 + 1] > renderer.worldHeight
            ) {
                chunk.views.Velocity[i * 2 + 1] *= -1; // Reverse vertical velocity
            }
        }
    },
};

// 6. renderer system to draw rectangles
const rendererSystem = {
    interpPos: Float32Array.from(chunk.views.Position), // for smooth movement - scratch memory
    render: (alpha: number) => {
        renderer.clear();

        const count = chunk.count;
        if (count === 0) return;

        // use alpha to interpolate positions for smooth movement
        const cur = chunk.views.Position;
        const prev = chunk.views.PreviousPosition;

        for (let i = 0; i < count * 2; ++i) {
            rendererSystem.interpPos[i] = prev[i] + (cur[i] - prev[i]) * alpha;
        }

        // rect data from subarrays
        const rectData: RectData = {
            positions: rendererSystem.interpPos.subarray(0, count * 2),
            sizes: chunk.views.Size.subarray(0, count * 2),
            colors: chunk.views.Color.subarray(0, count * 4),
        };

        rectPipeline.bind(renderer.gl);

        rectPipeline.draw(renderer.gl, rectData, count);
    },
};

export default () => {
    engine.addUpdateable(updateSystem);
    engine.addRenderable(rendererSystem);
    engine.start();
};
