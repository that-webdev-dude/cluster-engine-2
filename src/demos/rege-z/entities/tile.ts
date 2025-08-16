import { DESCRIPTORS, Component } from "../components";
import { Archetype } from "../../../cluster";
import type { ComponentValueMap } from "../../../cluster";

export const tileSchema = Archetype.register(
    DESCRIPTORS.Tile,
    DESCRIPTORS.Position,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite
);

export const wallSchema = Archetype.register(
    DESCRIPTORS.Wall,
    DESCRIPTORS.Position,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color,
    DESCRIPTORS.Sprite,
    DESCRIPTORS.AABB
);

export const floorSchema = Archetype.register(
    DESCRIPTORS.Floor,
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
    color: [number, number, number, number] = [255, 255, 255, 240]
): ComponentValueMap {
    return {
        [Component.Tile]: [1],
        [Component.Position]: [x, y],
        [Component.Size]: [tileSize, tileSize],
        [Component.Color]: color,
        [Component.Sprite]: frame, // [fx, fy, fw, fh] from atlas
    } as ComponentValueMap;
}
export function getWallComponents(
    x: number,
    y: number,
    tileSize: number,
    frame: [number, number, number, number],
    color: [number, number, number, number] = [255, 255, 255, 240]
): ComponentValueMap {
    return {
        [Component.Wall]: [1],
        [Component.Position]: [x, y],
        [Component.Size]: [tileSize, tileSize],
        [Component.Color]: color,
        [Component.Sprite]: frame, // [fx, fy, fw, fh] from atlas
        [Component.AABB]: [
            x - tileSize / 2,
            y - tileSize / 2,
            x + tileSize / 2,
            y + tileSize / 2,
        ],
    } as ComponentValueMap;
}
export function getFloorComponents(
    x: number,
    y: number,
    tileSize: number,
    frame: [number, number, number, number],
    color: [number, number, number, number] = [255, 255, 255, 240]
): ComponentValueMap {
    return {
        [Component.Floor]: [1],
        [Component.Position]: [x, y],
        [Component.Size]: [tileSize, tileSize],
        [Component.Color]: color,
        [Component.Sprite]: frame, // [fx, fy, fw, fh] from atlas
    } as ComponentValueMap;
}

export const tileArchetype = Archetype.create("tile", tileSchema);
export const wallArchetype = Archetype.create("wall", wallSchema);
export const floorArchetype = Archetype.create("floor", floorSchema);
