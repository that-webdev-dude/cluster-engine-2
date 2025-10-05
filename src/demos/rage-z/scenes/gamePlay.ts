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
import { MotionSystem } from "../systems/MotionSystem";
import { PlayerSystem } from "../systems/PlayerSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { WeaponSystem } from "../systems/WeaponSystem";
import { ZombieSystem } from "../systems/ZombieSystem";
import { BulletSystem } from "../systems/BulletSystem";
import { Component } from "../components";
import { createGamePlayGUI } from "../entities/GUI";
import { GUIRendererSystem } from "../systems/GUI/GUIRenderer";
import { GUITimerSystem } from "../systems/GUI/GUITimer";
import { GUILivesSystem } from "../systems/GUI/GUILives";
import { CullingSystem } from "../systems/CullingSystem";

export function createGamePlay() {
    const scene = new Scene();

    // entities
    createTileMapWithObstacles(scene, {});
    let cameraMeta = scene.createEntity(cameraArchetype, getCameraComponents());
    let playerMeta = scene.createEntity(playerArchetype, getPlayerComponents());
    scene.createEntity(weaponArchetype, getWeaponComponents());
    for (let i = 0; i < 10; i++) {
        scene.createEntity(zombieArchetype, getZombieComponents());
    }

    // systems
    const u = "update";
    const r = "render";
    scene.useECSSystem(u, new CullingSystem(store));
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
                        target: Component.Wall,
                        eventType: "zombie-wall-collision",
                    },
                    {
                        target: Component.Bullet,
                        eventType: "zombie-bullet-collision",
                    },
                ],
            },
            {
                main: Component.Bullet,
                targets: [
                    {
                        target: Component.Wall,
                        eventType: "bullet-wall-collision",
                    },
                ],
            },
        ])
    );

    scene.useECSSystem(r, new SpriteRendererSystem(store));

    // gui
    scene.gui = createGamePlayGUI();
    scene.useGUISystem(u, new GUITimerSystem(store));
    scene.useGUISystem(u, new GUILivesSystem(store));
    scene.useGUISystem(r, new GUIRendererSystem());

    return scene;
}
