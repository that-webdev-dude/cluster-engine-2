import { Archetype } from "../../../cluster/ecs/archetype";
import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { Renderer } from "../../../cluster/gl/Renderer";
import { ComponentValueMap } from "../../../cluster/types";

const worldW = Renderer.worldWidth();
const worldH = Renderer.worldHeight();

export const playerSchema = Archetype.register(
    DESCRIPTORS.Player,
    DESCRIPTORS.Position,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color
);

export function getPlayerComponents(): ComponentValueMap {
    return {
        [Component.Player]: [1],
        [Component.Position]: [worldW / 2, worldH / 2],
        [Component.Offset]: [0, 0],
        [Component.Angle]: [0],
        [Component.Pivot]: [0, 0],
        [Component.Size]: [32, 32],
        [Component.Color]: [0, 255, 0, 255],
    } as ComponentValueMap;
}

export const playerArchetype = Archetype.create("player", playerSchema, 1);
