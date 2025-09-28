import store from "../stores/store";
import { Component, DESCRIPTORS } from "../components";
import { Archetype, ComponentValueMap } from "../../../cluster";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

export const bulletSchema = Archetype.register(
    DESCRIPTORS.Bullet,
    DESCRIPTORS.Position,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite
);

export function getBulletComponents(): ComponentValueMap {
    return {
        [Component.Bullet]: [0],
        [Component.Position]: [
            worldW / 2,
            worldH / 2,
            worldW / 2,
            worldH / 2,
            0,
            0,
            0,
            0,
        ],
        [Component.Velocity]: [0, 0],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [32, 192, 32, 32],
    } as ComponentValueMap;
}

export const bulletArchetype = Archetype.create("bullet", bulletSchema);
