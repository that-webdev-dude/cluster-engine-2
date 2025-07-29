import { Scene } from "../../../cluster";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { SpriteRendererSystem } from "../systems/GLRenderer";
import { AnimationSystem } from "../systems/AnimationSystem";
import { PlayerSystem } from "../systems/PlayerSystem";
import store from "../stores/store";

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

    scene.createEntity(playerArchetype, getPlayerComponents());

    return scene;
}
