import store from "../../stores/store";
import { Cmath, Scene } from "../../../../cluster";
import { tileArchetype, getTileComponents } from "../../entities/tile";
import { spritesheet } from "../../assets";

const worldW = store.get("worldW");
const worldH = store.get("worldH");

const map: number[][] = [];
for (let row = 0; row < worldH / 32; row++) {
    map[row] = [];
    for (let col = 0; col < worldW / 32; col++) {
        // Randomly place tiles, for example
        map[row][col] = Cmath.rand(12, 15);
    }
}

export function createTileMap(scene: Scene, tileSize = 32) {
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const tileIndex = map[row][col];
            if (tileIndex > 0) {
                // Convert tile index to a frame rectangle in the atlas
                const frame = spritesheet.frameRectFromIndex(
                    Cmath.rand(1, 4) + 12 - 1
                );
                const x = col * tileSize;
                const y = row * tileSize;
                const comps = getTileComponents(x, y, tileSize, frame);
                scene.createEntity(tileArchetype, comps);
            }
        }
    }
}
