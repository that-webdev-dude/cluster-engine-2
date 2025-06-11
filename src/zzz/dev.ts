import { ComponentDescriptor, ComponentValueMap } from "./types";
import { Renderer } from "./gl/Renderer";
import { Engine } from "./core/Engine";
import { Archetype } from "./ecs/archetype";
import { CommandBuffer } from "./ecs/cmd";
import { World, WorldView } from "./ecs/world";
import { UpdateableSystem } from "./ecs/system";
import { MovementSystem } from "./commons/systems/movement";
import { RendererSystem } from "./commons/systems/renderer";
import { Component } from "./commons/components";
import { DESCRIPTORS } from "./commons/components";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

// // 1. systems to update the entities
class ObstacleSystem implements UpdateableSystem {
    update(view: WorldView, cmd: CommandBuffer, dt: number) {
        const renderer = Renderer.getInstance();
        view.forEachChunkWith(
            [Component.Position, Component.Size, Component.LifeSpan],
            (chunk) => {
                for (let i = 0; i < chunk.count; i++) {
                    let life = chunk.views.LifeSpan[i];
                    life -= dt;
                    if (life < 0) {
                        // Update position to a new random location within the world bounds
                        chunk.views.Position[i * 2] =
                            Math.random() *
                            (renderer.worldWidth - chunk.views.Size[i * 2]);
                        chunk.views.Position[i * 2 + 1] =
                            Math.random() *
                            (renderer.worldHeight -
                                chunk.views.Size[i * 2 + 1]);

                        chunk.views.LifeSpan[i] = 1; // Reset lifespan
                    } else {
                        chunk.views.LifeSpan[i] = life;
                    }
                }
            }
        );
    }
}

// activate the components for the game first
Archetype.register(...(DESCRIPTORS as ComponentDescriptor[]));

// 4. archetypes
const rectangleArchetype = Archetype.create(
    Component.Position,
    Component.Size,
    Component.Color,
    Component.Velocity,
    Component.PreviousPosition
);
const obstacleArchetype = Archetype.create(
    Component.Position,
    Component.Size,
    Component.Color,
    Component.LifeSpan
);

// 5. populate the world
const world = new World({
    updateableSystems: [new MovementSystem(), new ObstacleSystem()],
    renderableSystems: [new RendererSystem()],
});

for (let i = 0; i < 256 * 8; i++) {
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

const obstacleComps: ComponentValueMap = {
    [Component.Position]: [50, 50],
    [Component.Size]: [10, 10],
    [Component.Color]: [255, 0, 0, 255], // Red
    [Component.LifeSpan]: [1],
};

world.createEntity(obstacleArchetype, obstacleComps);

world.initialize();

export default () => {
    const engine = new Engine(60);
    engine.addUpdateable(world);
    engine.addRenderable(world);
    engine.addCallback(world);
    engine.start();
};
