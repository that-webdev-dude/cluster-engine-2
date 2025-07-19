import { Scene } from "../../../cluster/ecs/scene";
import { store } from "../stores";
import { GUISystem } from "../systems/GUI";
import { GUIEntity } from "../gui";
import { GLOBALS } from "../globals";
import { TitleSystem } from "../systems/title";

export function createGameTitle() {
    const scene = new Scene({
        storageUpdateSystems: [],
        storageRenderSystems: [],
        guiUpdateSystems: [new TitleSystem(store)],
        guiRenderSystems: [new GUISystem()],
    });

    scene.gui.add(GUIEntity.background("black"));
    scene.gui.add(
        GUIEntity.staticText({
            position: { x: GLOBALS.worldW / 2, y: GLOBALS.worldH / 2 },
            fill: "white",
            text: "xshooter",
            size: 24,
        })
    );

    return scene;
}
