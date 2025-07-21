import { Scene } from "../../../cluster/ecs/scene";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { GUISystem } from "../systems/GUIRenderer";
import { RendererSystem } from "../systems/renderer";
import { PlayerSystem } from "../systems/player";
import { MotionSystem } from "../systems/motion";
import { MeteorSystem } from "../systems/meteor";
import { LevelSystem } from "../systems/level";
import { BulletSystem } from "../systems/bullet";
import { CollisionSystem } from "../systems/collision";
import { GUITimerSystem } from "../systems/GUITimer";
import { GUILivesSysten } from "../systems/GUILives";
import { store } from "../stores";
import { createGamePlayGUI } from "../gui";

export function createGamePlay() {
    const scene = new Scene({
        storageUpdateSystems: [
            new LevelSystem(store),
            new PlayerSystem(store),
            new MotionSystem(store),
            new MeteorSystem(store),
            new BulletSystem(store),
            new CollisionSystem(store),
        ],
        storageRenderSystems: [new RendererSystem()],
        guiUpdateSystems: [
            new GUITimerSystem(store),
            new GUILivesSysten(store),
        ],
        guiRenderSystems: [new GUISystem()],
    });

    scene.createEntity(playerArchetype, getPlayerComponents());

    scene.gui = createGamePlayGUI();

    return scene;
}
