import { Archetype } from "../../../cluster/ecs/archetype";
import { Component, DESCRIPTORS } from "../components";
// import { Renderer } from "../../../cluster/gl/Renderer";
import { Vector } from "../../../cluster/tools/Vector";
import { GLOBALS } from "../globals";

const { worldW, worldH } = GLOBALS;
const sourceVec = new Vector(worldW / 2, worldH / 2);
const velocityVec = new Vector();

export const bulletSchema = Archetype.register(
    DESCRIPTORS.Bullet,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Speed,
    DESCRIPTORS.Velocity
);

export function getBulletComponents(targetX: number, targetY: number) {
    velocityVec
        .set(targetX, targetY)
        .connect(sourceVec)
        .reverse()
        .normalize()
        .scale(100);

    return {
        [Component.Bullet]: [1],
        [Component.PreviousPosition]: [sourceVec.x, sourceVec.y],
        [Component.Position]: [sourceVec.x, sourceVec.y],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [4, 4],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Speed]: [100],
        [Component.Velocity]: [velocityVec.x, velocityVec.y],
    };
}

export const bulletArchetype = Archetype.create("bullet", bulletSchema);
