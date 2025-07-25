import { Scene } from "../../../cluster/ecs/scene";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { cameraArchetype, getCameraComponents } from "../entities/camera";
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
import { createGamePlayGUI, createPauseDialogGUI } from "../gui";
import { CameraSystem } from "../systems/camera";
import { GamePauseEvent, GamePlayEvent, GameResumeEvent } from "../events";
import { PauseSystem } from "../systems/pause";
import { gameplaySound } from "../sounds";

function createPauseDialog() {
    const dialog = new Scene({
        storageUpdateSystems: [new PauseSystem(store)],
        storageRenderSystems: [],
        guiUpdateSystems: [
            new GUITimerSystem(store),
            new GUILivesSysten(store),
        ],
        guiRenderSystems: [new GUISystem()],
    });

    dialog.gui = createPauseDialogGUI();

    return dialog;
}

export function createGamePlay() {
    const scene = new Scene({
        storageUpdateSystems: [
            new LevelSystem(store),
            new PlayerSystem(store),
            new MotionSystem(store),
            new MeteorSystem(store),
            new BulletSystem(store),
            new CollisionSystem(store),
            new CameraSystem(store),
        ],
        storageRenderSystems: [new RendererSystem()],
        guiUpdateSystems: [
            new GUITimerSystem(store),
            new GUILivesSysten(store),
        ],
        guiRenderSystems: [new GUISystem()],
    });

    scene.createEntity(cameraArchetype, getCameraComponents());
    scene.createEntity(playerArchetype, getPlayerComponents());

    scene.gui = createGamePlayGUI();

    gameplaySound.play(); // play the soundtrack

    store.on<GamePauseEvent>(
        "gamePause",
        () => {
            gameplaySound.pause(); // pause the soundtrack
            scene.dialog = createPauseDialog();
        },
        false
    );

    store.on<GameResumeEvent>(
        "gameResume",
        () => {
            gameplaySound.resume(); // resume the soundtrack
            if (scene.dialog) {
                scene.dialog.destroy();
                scene.dialog = undefined;
            }
        },
        false
    );

    return scene;
}
