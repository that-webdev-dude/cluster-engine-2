import { Scene } from "../../../cluster/ecs/scene";
import { GUIRendererSystem } from "../systems/GUI/GUIRenderer";
import { GUITitleSystem } from "../systems/GUI/GUITitle";
import { createGameTitleGUI } from "../entities/GUI";
import store from "../stores/store";

export function createGameTitle() {
    const scene = new Scene({
        storageUpdateSystems: [],
        storageRenderSystems: [],
        guiUpdateSystems: [new GUITitleSystem(store)],
        guiRenderSystems: [new GUIRendererSystem()],
    });

    scene.gui = createGameTitleGUI();

    return scene;
}
