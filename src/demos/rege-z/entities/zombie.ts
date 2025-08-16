import store from "../stores/store";
import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { Archetype, Cmath } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

export const zombieSchema = Archetype.register(
    DESCRIPTORS.Zombie,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite,
    DESCRIPTORS.Animation
);

export function getZombieComponents(): ComponentValueMap {
    const posX = Cmath.rand(16, worldW - 16);
    const posY = Cmath.rand(16, worldH - 16);
    return {
        [Component.Zombie]: [1],
        // [Component.PreviousPosition]: [worldW / 2, worldH / 2],
        // [Component.Position]: [worldW / 2, worldH / 2],
        [Component.PreviousPosition]: [posX, posY],
        [Component.Position]: [posX, posY],
        [Component.Velocity]: [0, 0],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [-32, 32],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [0, 2 * 32, 32, 32],
        [Component.Animation]: [6, 9, 6, 0.2, 0, 1],
    } as ComponentValueMap;
}

export const zombieArchetype = Archetype.create("zombie", zombieSchema);
