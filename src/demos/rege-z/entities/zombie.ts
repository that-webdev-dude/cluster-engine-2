import store from "../stores/store";
import { DESCRIPTORS, Component } from "../components";
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
    const x = Cmath.rand(16, worldW - 16);
    const y = Cmath.rand(16, worldH - 16);
    const w = 32;
    const h = 32;

    return {
        [Component.Zombie]: [1],
        [Component.PreviousPosition]: [x, y],
        [Component.Position]: [x, y],
        [Component.Velocity]: [0, 0],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [-w, h],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [0, 2 * 32, 32, 32],
        [Component.Animation]: [6, 9, 6, 0.2, 0, 1],
    } as ComponentValueMap;
}

export const zombieArchetype = Archetype.create("zombie", zombieSchema);
