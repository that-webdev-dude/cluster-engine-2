import { Scene } from "../../../cluster";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { SpriteRendererSystem } from "../systems/GLRenderer";
import { AnimationSystem } from "../systems/AnimationSystem";
import store from "../stores/store";

export function createGamePlay() {
    const scene = new Scene({
        storageUpdateSystems: [new AnimationSystem(store)],
        storageRenderSystems: [new SpriteRendererSystem()],
        guiUpdateSystems: [],
        guiRenderSystems: [],
    });

    scene.createEntity(playerArchetype, getPlayerComponents());

    return scene;
}
