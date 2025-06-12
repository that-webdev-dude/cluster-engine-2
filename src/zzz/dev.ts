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
import { Keyboard } from "./core/Input";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

// // 1. systems to update the entities
class PlayerSystem implements UpdateableSystem {
    private keyboard = Keyboard;
    update(view: WorldView, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.InputKey, Component.Velocity],
            (chunk) => {
                for (let i = 0; i < chunk.count; i++) {
                    if (this.keyboard.active) {
                        chunk.views.InputKey[i * 2] = this.keyboard.x();
                        chunk.views.InputKey[i * 2 + 1] = this.keyboard.y();

                        const vx = 200 * this.keyboard.x();
                        const vy = 200 * this.keyboard.y();
                        chunk.views.Velocity[i * 2] = vx;
                        chunk.views.Velocity[i * 2 + 1] = vy;
                    }
                }
            }
        );
    }
}
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
const controllableArchetype = Archetype.create(
    Component.InputKey,
    Component.Position,
    Component.Size,
    Component.Color,
    Component.Velocity,
    Component.PreviousPosition
);

// 5. populate the world
const world = new World({
    updateableSystems: [
        new PlayerSystem(),
        new MovementSystem(),
        new ObstacleSystem(),
    ],
    renderableSystems: [new RendererSystem()],
});

// create bouncing rects
for (let i = 0; i < 256 * 1; i++) {
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

// create obstacles
for (let i = 0; i < 2; i++) {
    const px = Math.random() * 100;
    const py = Math.random() * 100;
    const sx = 12;
    const sy = 12;
    const r = 255;
    const g = 0;
    const b = 0;
    const a = 255;

    const comps: ComponentValueMap = {
        [Component.Position]: [px, py],
        [Component.Size]: [sx, sy],
        [Component.Color]: [r, g, b, a],
        [Component.LifeSpan]: [1],
    };

    world.createEntity(obstacleArchetype, comps);
}

// create playerRect
const playerComps: ComponentValueMap = {
    [Component.Position]: [200, 100],
    [Component.Size]: [24, 24],
    [Component.Color]: [0, 255, 0, 255],
    [Component.Velocity]: [0, 0],
    [Component.PreviousPosition]: [400, 400],
    [Component.InputKey]: [0, 0],
};
world.createEntity(controllableArchetype, playerComps);

// init the world
world.initialize();

export default () => {
    const engine = new Engine(60);
    engine.addUpdateable(world);
    engine.addRenderable(world);
    engine.addCallback(world);
    engine.start();
};
