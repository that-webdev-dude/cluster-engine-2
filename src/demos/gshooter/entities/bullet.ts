import { Archetype } from "../../../cluster/ecs/archetype";
import { Scene } from "../../../cluster/ecs/scene";
import { Component } from "../components";

const archetype = Archetype.create(
    [
        Component.Bullet,
        Component.Position,
        Component.Angle,
        Component.Pivot,
        Component.Size,
        Component.Color,
    ],
    1 // only one player exists
);

export function createBullet(scene: Scene) {
    scene.createEntity(archetype, {
        [Component.Bullet]: [1],
        [Component.Position]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [0, 255, 0, 255],
    });
}
