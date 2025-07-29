import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { Archetype } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster";

export const tileSchema = Archetype.register(
    DESCRIPTORS.Tile,
    DESCRIPTORS.Position,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite
);

export function getTileComponents(
    x: number,
    y: number,
    tileSize: number,
    frame: [number, number, number, number],
    color: [number, number, number, number] = [255, 255, 255, 255]
): ComponentValueMap {
    return {
        [Component.Tile]: [1],
        [Component.Position]: [x, y],
        [Component.Size]: [tileSize, tileSize],
        [Component.Color]: color,
        [Component.Sprite]: frame, // [fx, fy, fw, fh] from atlas
    } as ComponentValueMap;
}

export const tileArchetype = Archetype.create("tile", tileSchema);
