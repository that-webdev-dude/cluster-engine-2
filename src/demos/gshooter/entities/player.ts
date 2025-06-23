import { Archetype } from "../../../cluster/ecs/archetype";
import { Scene } from "../../../cluster/ecs/scene";
import { Renderer } from "../../../cluster/gl/Renderer";
import { Component } from "../components";

const worldW = Renderer.worldWidth();
const worldH = Renderer.worldHeight();

const archetype = Archetype.create(
    [
        Component.Player,
        Component.Position,
        Component.Offset,
        Component.Angle,
        Component.Pivot,
        Component.Size,
        Component.Color,
    ],
    1 // only one player exists
);

export function createPlayer(scene: Scene) {
    scene.createEntity(archetype, {
        [Component.Player]: [1],
        [Component.Position]: [worldW / 2, worldH / 2],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [0, 255, 0, 255],
    });
}
