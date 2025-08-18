import store from "../stores/store";
import { Scene } from "../../../cluster";
import { createTileMapWithObstacles } from "../entities/tilemap";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { cameraArchetype, getCameraComponents } from "../entities/camera";
import { zombieArchetype, getZombieComponents } from "../entities/zombie";
import { weaponArchetype, getWeaponComponents } from "../entities/weapon";
import { SpriteRendererSystem } from "../systems/RendererSystem";
import { AnimationSystem } from "../systems/AnimationSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { TilemapSystem } from "../systems/TilemapSystem";
import { MotionSystem } from "../systems/MotionStstem";
import { PlayerSystem } from "../systems/PlayerSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { WeaponSystem } from "../systems/WeaponSystem";
import { ZombieSystem } from "../systems/ZombieSystem";
import { Component } from "../components";

export function createGamePlay() {
    const scene = new Scene();

    createTileMapWithObstacles(scene, {});

    let playerMeta = scene.createEntity(playerArchetype, getPlayerComponents());

    scene.createEntity(weaponArchetype, getWeaponComponents());

    for (let i = 0; i < 10; i++) {
        scene.createEntity(zombieArchetype, getZombieComponents());
    }

    scene.createEntity(cameraArchetype, getCameraComponents());

    // systems
    scene.useECSSystem("update", new TilemapSystem(store));
    scene.useECSSystem("update", new PlayerSystem(store));
    scene.useECSSystem("update", new WeaponSystem(store, playerMeta));
    scene.useECSSystem("update", new ZombieSystem(store, playerMeta));
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
                    {
                        target: Component.Wall,
                        eventType: "player-wall-collision",
                    },
                ],
            },
            {
                main: Component.Zombie,
                targets: [
                    {
                        target: Component.Zombie,
                        eventType: "zombie-zombie-collision",
                    },
                ],
            },
        ])
    );

    scene.useECSSystem("render", new SpriteRendererSystem());

    return scene;
}
