import { Scene } from "../../../cluster/ecs/scene";
import { store } from "../stores";
import { GUISystem } from "../systems/GUIRenderer";
import { TitleSystem } from "../systems/title";
import { createGameTitleGUI } from "../gui";

export function createGameTitle() {
    const scene = new Scene({
        storageUpdateSystems: [],
        storageRenderSystems: [],
        guiUpdateSystems: [new TitleSystem(store)],
        guiRenderSystems: [new GUISystem()],
    });

    scene.gui = createGameTitleGUI();

    return scene;
}
