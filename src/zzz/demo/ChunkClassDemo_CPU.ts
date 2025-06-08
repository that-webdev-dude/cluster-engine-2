// little demo app to test on archetypes, chunks, and the engine
// this is simply drawing rectangles on screen.
// data is stored in a single chunk

import { Display } from "../../cluster/core/Display";
import { Engine } from "../../cluster/core/Engine";
import { Archetype } from "../ecs/archetypeV2";
import { ComponentType, DESCRIPTORS } from "../ecs/components";
import { Chunk } from "../ecs/chunk";

const display = new Display({
    parentID: "#app",
    width: 800,
    height: 600,
});

const engine = new Engine(60);

// 1. create a rectangle archetype
const rectangleArchetype = Archetype.create(
    ComponentType.EntityId,
    ComponentType.Position,
    ComponentType.Size,
    ComponentType.Color,
    ComponentType.Velocity,
    ComponentType.PreviousPosition
);

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

    chunk.views.Position[i * 2] = Math.random() * display.width;
    chunk.views.Position[i * 2 + 1] = Math.random() * display.height;

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

            if (x < 0 || x + chunk.views.Size[i * 2] > display.width) {
                chunk.views.Velocity[i * 2] *= -1; // Reverse horizontal velocity
            }
            if (y < 0 || y + chunk.views.Size[i * 2 + 1] > display.height) {
                chunk.views.Velocity[i * 2 + 1] *= -1; // Reverse vertical velocity
            }
        }
    },
};

// 6. system to render the rectangles
const ctx = display.view.getContext("2d");
if (!ctx) {
    throw new Error("Failed to get 2D context from display view");
}

const renderSystem = {
    render: (alpha: number) => {
        ctx.clearRect(0, 0, display.width, display.height);

        for (let i = 0; i < chunk.count; i++) {
            const base = i * 2;

            // linear-interpolate position
            const prevX = chunk.views.PreviousPosition[base];
            const prevY = chunk.views.PreviousPosition[base + 1];
            const currX = chunk.views.Position[base];
            const currY = chunk.views.Position[base + 1];

            const x = prevX + (currX - prevX) * alpha;
            const y = prevY + (currY - prevY) * alpha;

            // size / colour unchanged
            const w = chunk.views.Size[base];
            const h = chunk.views.Size[base + 1];

            const r = chunk.views.Color[i * 4];
            const g = chunk.views.Color[i * 4 + 1];
            const b = chunk.views.Color[i * 4 + 2];
            const a = chunk.views.Color[i * 4 + 3];

            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fillRect(x, y, w, h);
        }
    },
};

export default () => {
    engine.addUpdateable(updateSystem);
    engine.addRenderable(renderSystem);
    engine.start();
};
