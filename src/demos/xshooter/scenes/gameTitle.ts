import { Scene } from "../../../cluster/ecs/scene";
import { store } from "../stores";
import { GUISystem } from "../systems/GUI";

export function createGameTitle() {
    const scene = new Scene({
        storageUpdateSystems: [],
        storageRenderSystems: [],
        guiRenderSystems: [new GUISystem()],
    });

    return scene;
}
