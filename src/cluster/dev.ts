import { ComponentDescriptor, ComponentValueMap } from "./types";
import { Renderer } from "./gl/Renderer";
import { Archetype } from "./ecs/archetype";
import { CommandBuffer } from "./ecs/cmd";
import { UpdateableSystem } from "./ecs/system";
import { MovementSystem } from "./commons/systems/movement";
import { RendererSystem } from "./commons/systems/renderer";
import { CameraSystem } from "./commons/systems/camera";
import { Component } from "./commons/components";
import { DESCRIPTORS } from "./commons/components";
import { Keyboard } from "./core/Input";
import { Game } from "./ecs/game";
import { Scene, View } from "./ecs/scene";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

// systems to update the entities
class PlayerSystem implements UpdateableSystem {
    private keyboard = Keyboard;
    update(view: View, cmd: CommandBuffer, dt: number) {
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
class RotationSystem implements UpdateableSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.Angle, Component.AngularVelocity],
            (chunk) => {
                for (let i = 0; i < chunk.count; i++) {
                    chunk.views.Angle[i] += chunk.views.AngularVelocity[i] * dt;
                }
            }
        );
    }
}
class ObstacleSystem implements UpdateableSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
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

// populate the world
const scene = new Scene({
    updateableSystems: [
        new PlayerSystem(),
        new CameraSystem(),
        new ObstacleSystem(),
        new MovementSystem(),
        new RotationSystem(),
    ],
    renderableSystems: [new RendererSystem()],
});

// keep this for world size
const renderer = Renderer.getInstance();
const cameraW = renderer.worldWidth;
const cameraH = renderer.worldHeight;

// entities
const cameraArchetype = Archetype.create(
    [
        Component.Position,
        Component.Size,
        Component.Camera,
        Component.PreviousPosition,
    ],
    1
);
scene.createEntity(cameraArchetype, {
    [Component.Position]: [0, 0],
    [Component.Size]: [cameraW, cameraH],
    [Component.Camera]: [200],
    [Component.PreviousPosition]: [0, 0],
});

const playerArchetype = Archetype.create(
    [
        Component.Position,
        Component.InputKey,
        Component.Size,
        Component.Color,
        Component.Velocity,
        Component.PreviousPosition,
        // Component.PreviousAngle,
        Component.Angle,
        Component.Pivot,
        Component.AngularVelocity,
    ],
    1
);
scene.createEntity(playerArchetype, {
    [Component.Position]: [2, 2],
    [Component.Size]: [-48, -48],
    [Component.Color]: [0, 255, 0, 255],
    [Component.Velocity]: [0, 0],
    [Component.PreviousPosition]: [400, 400],
    // [Component.PreviousAngle]: [0],
    [Component.InputKey]: [0, 0],
    [Component.Angle]: [0],
    [Component.Pivot]: [0, 0],
    [Component.AngularVelocity]: [0],
});

const rectangleArchetype = Archetype.create([
    Component.Position,
    Component.Size,
    Component.Color,
    Component.Velocity,
    Component.PreviousPosition,
]);
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

    scene.createEntity(rectangleArchetype, comps);
}

const circleArchetype = Archetype.create([
    Component.Position,
    Component.Size,
    Component.Color,
    // Component.Velocity,
    Component.PreviousPosition,
]);
for (let i = 0; i < 1 * 1; i++) {
    const px = 2;
    const py = 2;
    const ppx = px;
    const ppy = py;
    // const rad = 48;
    const w = -24;
    const h = -24;
    const r = 255;
    const g = 255;
    const b = 255;
    const a = 255;
    const vx = (Math.random() - 0.5) * 200;
    const vy = (Math.random() - 0.5) * 200;

    const comps: ComponentValueMap = {
        [Component.Position]: [px, py],
        [Component.Size]: [w, h],
        [Component.Color]: [r, g, b, a],
        // [Component.Velocity]: [vx, vy],
        [Component.PreviousPosition]: [ppx, ppy],
    };

    scene.createEntity(circleArchetype, comps);
}

const obstacleArchetype = Archetype.create([
    Component.Position,
    Component.Size,
    Component.Color,
    Component.LifeSpan,
]);
for (let i = 0; i < 10; i++) {
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

    scene.createEntity(obstacleArchetype, comps);
}

// init the game
const game = new Game();

export default () => {
    game.setScene(scene);
    game.start();
};
