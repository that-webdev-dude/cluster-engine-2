import store from "../stores/store";
import { Scene } from "../../../cluster";
import { createTileMapWithObstacles } from "../entities/tilemap";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { cameraArchetype, getCameraComponents } from "../entities/camera";
import { zombieArchetype, getZombieComponents } from "../entities/zombie";
import { weaponArchetype, getWeaponComponents } from "../entities/weapon";
import { bulletArchetype, getBulletComponents } from "../entities/bullet";
import { SpriteRendererSystem } from "../systems/RendererSystem";
import { AnimationSystem } from "../systems/AnimationSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { TilemapSystem } from "../systems/TilemapSystem";
import { MotionSystem } from "../systems/MotionStstem";
import { PlayerSystem } from "../systems/PlayerSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { WeaponSystem } from "../systems/WeaponSystem";
import { ZombieSystem } from "../systems/ZombieSystem";
import { BulletSystem } from "../systems/BulletSystem";
import { Component } from "../components";

export function createGamePlay() {
    const scene = new Scene();

    createTileMapWithObstacles(scene, {});

    let cameraMeta = scene.createEntity(cameraArchetype, getCameraComponents());
    let playerMeta = scene.createEntity(playerArchetype, getPlayerComponents());

    scene.createEntity(weaponArchetype, getWeaponComponents());
    // for (let i = 0; i < 10; i++) {
    //     scene.createEntity(zombieArchetype, getZombieComponents());
    // }

    // systems
    const u = "update";
    scene.useECSSystem(u, new TilemapSystem(store));
    scene.useECSSystem(u, new PlayerSystem(store));
    scene.useECSSystem(u, new WeaponSystem(store, playerMeta, cameraMeta));
    scene.useECSSystem(u, new BulletSystem(store));
    scene.useECSSystem(u, new ZombieSystem(store, playerMeta));
    scene.useECSSystem(u, new AnimationSystem(store));
    scene.useECSSystem(u, new CameraSystem(store, playerMeta));
    scene.useECSSystem(u, new MotionSystem(store));
    scene.useECSSystem(
        u,
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

    const r = "render";
    scene.useECSSystem(r, new SpriteRendererSystem(store));

    return scene;
}
