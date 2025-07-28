import { Scene } from "../../../cluster";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { SpriteRendererSystem } from "../systems/GLRenderer";

export function createGamePlay() {
    const scene = new Scene({
        storageUpdateSystems: [],
        storageRenderSystems: [new SpriteRendererSystem()],
        guiUpdateSystems: [],
        guiRenderSystems: [],
    });

    scene.createEntity(playerArchetype, getPlayerComponents());

    return scene;
}
