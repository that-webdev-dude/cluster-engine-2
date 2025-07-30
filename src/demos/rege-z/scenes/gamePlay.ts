import store from "../stores/store";
import { playerArchetype } from "../entities/player";
import { getPlayerComponents } from "../entities/player";
import { cameraArchetype } from "../entities/camera";
import { getCameraComponents } from "../entities/camera";
import { createTileMap } from "../entities/tilemap";
import { SpriteRendererSystem } from "../systems/RendererSystem";
import { AnimationSystem } from "../systems/AnimationSystem";
import { MotionSystem } from "../systems/MotionStstem";
import { PlayerSystem } from "../systems/PlayerSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { Scene } from "../../../cluster";

export function createGamePlay() {
    const scene = new Scene({
        storageUpdateSystems: [
            new PlayerSystem(store),
            new MotionSystem(store),
            new AnimationSystem(store),
            new CameraSystem(store),
        ],
        storageRenderSystems: [new SpriteRendererSystem()],
        guiUpdateSystems: [],
        guiRenderSystems: [],
    });

    createTileMap(scene, 32);

    scene.createEntity(playerArchetype, getPlayerComponents());

    scene.createEntity(cameraArchetype, getCameraComponents());

    return scene;
}
