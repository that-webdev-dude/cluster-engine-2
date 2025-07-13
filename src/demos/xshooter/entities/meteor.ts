import { Archetype } from "../../../cluster/ecs/archetype";
import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { Cmath } from "../../../cluster/tools";
import { Vector } from "../../../cluster/tools/Vector";
// import { Renderer } from "../../../cluster/gl/Renderer";
import { GLOBALS } from "../globals";

const { worldW, worldH } = GLOBALS;
const targetVec = new Vector(worldW / 2, worldH / 2);

export const meteorSchema = Archetype.register(
    DESCRIPTORS.Meteor,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color
);

function spawnTop(size: number): { x: number; y: number } {
    return {
        x: Cmath.randf(-size, worldW + size),
        y: -size,
    };
}

function spawnRight(size: number): { x: number; y: number } {
    return {
        x: worldW + size,
        y: Cmath.randf(-size, worldH + size),
    };
}

function spawnBottom(size: number): { x: number; y: number } {
    return {
        x: Cmath.randf(-size, worldW + size),
        y: worldH + size,
    };
}

function spawnLeft(size: number): { x: number; y: number } {
    return {
        x: -size,
        y: Cmath.randf(-size, worldH + size),
    };
}

function spawn(size: number): { x: number; y: number } {
    return Cmath.randOneFrom([
        spawnTop(size),
        spawnRight(size),
        spawnBottom(size),
        spawnLeft(size),
    ]);
}

export function getMeteorComponents() {
    let sz = 32;
    let posVec = spawn(sz) as Vector;
    let velVec = Vector.from(posVec)
        .connect(targetVec)
        .normalize()
        .scale(Cmath.rand(10, 40));

    return {
        [Component.Meteor]: [1],
        [Component.PreviousPosition]: [posVec.x, posVec.y],
        [Component.Position]: [posVec.x, posVec.y],
        [Component.Velocity]: [velVec.x, velVec.y],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [sz, sz],
        [Component.Color]: [255, 0, 0, 255],
    };
}

export const meteorArchetype = Archetype.create("meteor", meteorSchema);
