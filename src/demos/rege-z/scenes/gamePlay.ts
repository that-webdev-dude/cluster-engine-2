import store from "../stores/store";
import { playerArchetype } from "../entities/player";
import { getPlayerComponents } from "../entities/player";
import { cameraArchetype } from "../entities/camera";
import { getCameraComponents } from "../entities/camera";
import { zombieArchetype } from "../entities/zombie";
import { getZombieComponents } from "../entities/zombie";
import { createTileMap } from "../entities/tilemap";
import { SpriteRendererSystem } from "../systems/RendererSystem";
import { AnimationSystem } from "../systems/AnimationSystem";
import { MotionSystem } from "../systems/MotionStstem";
import { PlayerSystem } from "../systems/PlayerSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { Scene } from "../../../cluster";
import { Component } from "../components";

export function createGamePlay() {
    // const scene = new Scene({
    //     storageUpdateSystems: [
    //         new PlayerSystem(store),
    //         new MotionSystem(store),
    //         new AnimationSystem(store),
    //         new CameraSystem(store),
    //     ],
    //     storageRenderSystems: [new SpriteRendererSystem()],
    //     guiUpdateSystems: [],
    //     guiRenderSystems: [],
    // });

    const scene = new Scene();

    createTileMap(scene, 32);

    let playerMeta = scene.createEntity(playerArchetype, getPlayerComponents());

    for (let i = 0; i < 10; i++) {
        scene.createEntity(zombieArchetype, getZombieComponents());
    }

    scene.createEntity(cameraArchetype, getCameraComponents());

    // systems
    scene.useECSSystem("update", new PlayerSystem(store));
    scene.useECSSystem("update", new MotionSystem(store));
    scene.useECSSystem("update", new AnimationSystem(store));
    scene.useECSSystem("update", new CameraSystem(store, playerMeta));
    scene.useECSSystem(
        "update",
        new CollisionSystem(store, [
            {
                main: Component.Player,
                targets: [
                    {
                        target: Component.Zombie,
                        eventType: "player-zombie-collision",
                    },
                ],
            },
        ])
    );

    scene.useECSSystem("render", new SpriteRendererSystem());

    return scene;
}
