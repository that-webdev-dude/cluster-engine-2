import { Archetype } from "../../../cluster/ecs/archetype";
import { Scene } from "../../../cluster/ecs/scene";
import { Component } from "../components";

const archetype = Archetype.create(
    "meteor",
    [
        Component.Meteor,
        Component.PreviousPosition,
        Component.Position,
        Component.Velocity,
        Component.Offset,
        Component.Angle,
        Component.Pivot,
        Component.Size,
        Component.Color,
    ],
    1 // only one player exists
);

export function createMeteor(
    scene: Scene,
    px: number,
    py: number,
    vx: number,
    vy: number,
    sz: number,
    color: [number, number, number, number]
) {
    scene.createEntity(archetype, {
        [Component.Meteor]: [1],
        [Component.PreviousPosition]: [0, 0],
        [Component.Position]: [0, 0],
        [Component.Velocity]: [50, 50],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [255, 0, 0, 255],
    });
}
