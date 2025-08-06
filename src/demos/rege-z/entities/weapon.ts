import store from "../stores/store";
import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { Archetype } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

export const weaponSchema = Archetype.register(
    DESCRIPTORS.Weapon,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite
);

export function getWeaponComponents(): ComponentValueMap {
    return {
        [Component.Weapon]: [1],
        [Component.PreviousPosition]: [worldW / 2, worldH / 2],
        [Component.Position]: [worldW / 2, worldH / 2],
        [Component.Velocity]: [0, 0],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [0, 192, 32, 32],
    } as ComponentValueMap;
}

export const weaponArchetype = Archetype.create("weapon", weaponSchema, 1);
