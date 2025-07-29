import store from "../stores/store";
import { playerArchetype } from "../entities/player";
import { getPlayerComponents } from "../entities/player";
import { createTileMap } from "../entities/tilemap";
import { SpriteRendererSystem } from "../systems/RendererSystem";
import { AnimationSystem } from "../systems/AnimationSystem";
import { PlayerSystem } from "../systems/PlayerSystem";
import { Scene } from "../../../cluster";

export function createGamePlay() {
    const scene = new Scene({
        storageUpdateSystems: [
            new PlayerSystem(store),
            new AnimationSystem(store),
        ],
        storageRenderSystems: [new SpriteRendererSystem()],
        guiUpdateSystems: [],
        guiRenderSystems: [],
    });

    createTileMap(scene, 32);

    scene.createEntity(playerArchetype, getPlayerComponents());

    return scene;
}
