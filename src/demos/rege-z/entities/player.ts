import store from "../stores/store";
import { DESCRIPTORS, Component } from "../components";
import { Archetype } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

export const playerSchema = Archetype.register(
    DESCRIPTORS.Player,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite,
    DESCRIPTORS.Animation,
    DESCRIPTORS.AABB
);

export function getPlayerComponents(): ComponentValueMap {
    const x = worldW / 2;
    const y = worldH / 2;
    const w = 32;
    const h = 32;

    return {
        [Component.Player]: [1],
        [Component.PreviousPosition]: [x, y],
        [Component.Position]: [x, y],
        [Component.Velocity]: [0, 0],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [w, h],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [0, 0, w, h],
        [Component.Animation]: [4, 5, 4, 0.2, 0, 1],
        [Component.AABB]: [x - w * 0.5, y - h * 0.5, x + w * 0.5, y + y * 0.5],
    } as ComponentValueMap;
}

export const playerArchetype = Archetype.create("player", playerSchema, 1);
