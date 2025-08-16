import store from "../../stores/store";
import { Cmath, Scene } from "../../../../cluster";
import {
    wallArchetype,
    getWallComponents,
    floorArchetype,
    getFloorComponents,
} from "../../entities/tile";
import { spritesheet } from "../../assets";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

const map: number[][] = [];
for (let row = 0; row <= worldH / 32; row++) {
    map[row] = [];
    for (let col = 0; col <= worldW / 32; col++) {
        // Randomly place tiles, for example
        // map[row][col] = Cmath.rand(12, 15);
        map[row][col] = Cmath.rand(12, 15);
    }
}

export function createTileMap(scene: Scene, tileSize = 32) {
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const tileIndex = map[row][col];
            if (tileIndex > 0) {
                // Convert tile index to a frame rectangle in the atlas
                let frame = spritesheet.frameRectFromIndex(
                    Cmath.rand(1, 4) + 12 - 1
                );
                const x = col * tileSize;
                const y = row * tileSize;

                if (
                    row === 0 ||
                    row === map.length - 1 ||
                    col === 0 ||
                    col === map[row].length - 1
                ) {
                    frame = spritesheet.frameRectFromIndex(16);
                    const comps = getWallComponents(x, y, tileSize, frame);
                    scene.createEntity(wallArchetype, comps);
                    continue;
                }
                if (row === 1 && col >= 1 && col <= map[row].length - 2) {
                    frame = spritesheet.frameRectFromIndex(17);
                    const comps = getWallComponents(x, y, tileSize, frame);
                    scene.createEntity(wallArchetype, comps);
                    continue;
                }

                const comps = getFloorComponents(x, y, tileSize, frame);
                scene.createEntity(floorArchetype, comps);
            }
        }
    }
}
