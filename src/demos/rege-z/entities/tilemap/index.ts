/**
 * Tilemap entity factory utilities.
 *
 * This module procedurally builds a simple bordered tile map and exposes
 * `createTileMap` which instantiates ECS entities (walls + floor) directly
/**
 * Tilemap entity factory utilities.
 */
import store from "../../stores/store";
import { Cmath, Scene } from "../../../../cluster";
import { spritesheet } from "../../assets";
import {
    wallArchetype,
    getWallComponents,
    floorArchetype,
    getFloorComponents,
} from "../../entities/tile";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

// Base random map (used by simple createTileMap)
const map: number[][] = [];
for (let r = 0; r <= worldH / 32; r++) {
    map[r] = [];
    for (let c = 0; c <= worldW / 32; c++) map[r][c] = Cmath.rand(12, 15);
}

export function createTileMap(scene: Scene, tileSize = 32) {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            const idx = map[r][c];
            if (idx <= 0) continue;
            let frame = spritesheet.frameRectFromIndex(
                Cmath.rand(1, 4) + 12 - 1
            );
            const x = c * tileSize,
                y = r * tileSize;
            if (!r || !c || r === map.length - 1 || c === map[r].length - 1) {
                frame = spritesheet.frameRectFromIndex(16);
                scene.createEntity(
                    wallArchetype,
                    getWallComponents(x, y, tileSize, frame)
                );
                continue;
            }
            if (r === 1 && c >= 1 && c <= map[r].length - 2) {
                frame = spritesheet.frameRectFromIndex(17);
                scene.createEntity(
                    wallArchetype,
                    getWallComponents(x, y, tileSize, frame)
                );
                continue;
            }
            scene.createEntity(
                floorArchetype,
                getFloorComponents(x, y, tileSize, frame)
            );
        }
    }
}

export function createTileMapWithObstacles(
    scene: Scene,
    opts: {
        clusters?: number;
        radius?: number;
        safeMargin?: number;
        tileSize?: number;
    } = {}
) {
    const clusters = opts.clusters ?? 6;
    const baseRadius = opts.radius ?? 1;
    const safeMargin = opts.safeMargin ?? 3;
    const tileSize = opts.tileSize ?? 32;
    const rows = map.length,
        cols = map[0].length;
    const obstacle: boolean[][] = Array.from({ length: rows }, () =>
        Array(cols).fill(false)
    );
    const stamp = (cx: number, cy: number, r: number) => {
        const r2 = r * r;
        for (
            let y = Math.max(1, cy - r);
            y <= Math.min(rows - 2, cy + r);
            y++
        ) {
            const dy = y - cy;
            for (
                let x = Math.max(1, cx - r);
                x <= Math.min(cols - 2, cx + r);
                x++
            ) {
                const dx = x - cx;
                if (dx * dx + dy * dy <= r2) obstacle[y][x] = true;
            }
        }
    };
    for (let i = 0; i < clusters; i++) {
        stamp(
            Cmath.rand(safeMargin, cols - safeMargin - 1),
            Cmath.rand(safeMargin, rows - safeMargin - 1),
            Math.max(1, baseRadius + Cmath.rand(-1, 1))
        );
    }
    const wall = (x: number, y: number, f: number) =>
        scene.createEntity(
            wallArchetype,
            getWallComponents(x, y, tileSize, spritesheet.frameRectFromIndex(f))
        );
    const floor = (x: number, y: number) =>
        scene.createEntity(
            floorArchetype,
            getFloorComponents(
                x,
                y,
                tileSize,
                spritesheet.frameRectFromIndex(Cmath.rand(1, 4) + 11)
            )
        );
    // Borders + ridge
    for (let c = 0; c < cols; c++) {
        wall(c * tileSize, 0, 16);
        wall(c * tileSize, (rows - 1) * tileSize, 16);
    }
    for (let r = 1; r < rows - 1; r++) {
        wall(0, r * tileSize, 16);
        wall((cols - 1) * tileSize, r * tileSize, 16);
    }
    for (let c = 1; c < cols - 1; c++) wall(c * tileSize, 1 * tileSize, 17);
    for (let r = 2; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (obstacle[r][c]) wall(c * tileSize, r * tileSize, 16);
            else floor(c * tileSize, r * tileSize);
        }
    }
}
