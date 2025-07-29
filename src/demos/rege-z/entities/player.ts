import store from "../stores/store";
import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { Archetype } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster/types";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

export const playerSchema = Archetype.register(
    DESCRIPTORS.Player,
    DESCRIPTORS.Position,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite,
    DESCRIPTORS.Animation
);

export function getPlayerComponents(): ComponentValueMap {
    return {
        [Component.Player]: [1],
        // [Component.Position]: [32, worldH / 2],
        [Component.Position]: [worldW / 2, worldH / 2],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [255, 255, 255, 255],
        [Component.Sprite]: [64, 32, 32, 32],
        [Component.Animation]: [6, 9, 32, 32, 0.25, 0],
    } as ComponentValueMap;
}

export const playerArchetype = Archetype.create("player", playerSchema, 1);
