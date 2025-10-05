import store from "../stores/store";
import { DESCRIPTORS, Component } from "../components";
import { Archetype, Cmath } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

export const zombieSchema = Archetype.register(
    DESCRIPTORS.Zombie,
    DESCRIPTORS.Position,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Speed,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite,
    DESCRIPTORS.Animation,
    DESCRIPTORS.AABB,
    DESCRIPTORS.Visibility
);

export function getZombieComponents(): ComponentValueMap {
    const x = Cmath.rand(56, worldW - 56);
    const y = Cmath.rand(56, worldH - 56);
    const w = 32;
    const h = 32;

    return {
        [Component.Zombie]: [1],
        [Component.Position]: [x, y, x, y, 0, 0, 0, 0],
        [Component.Velocity]: [0, 0],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [-w, h],
        [Component.Speed]: [Cmath.rand(15, 55)],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [0, 2 * 32, 32, 32],
        [Component.Animation]: [6, 9, 6, 0.2, 0, 1],
        [Component.AABB]: [x - w * 0.5, y - h * 0.5, x + w * 0.5, y + h * 0.5],
        [Component.Visibility]: [0],
    } as ComponentValueMap;
}

export const zombieArchetype = Archetype.create("zombie", zombieSchema);
