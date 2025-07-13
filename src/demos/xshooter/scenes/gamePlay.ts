import { Scene } from "../../../cluster/ecs/scene";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { GUISystem } from "../systems/GUI";
import { RendererSystem } from "../systems/renderer";
import { PlayerSystem } from "../systems/player";
import { MotionSystem } from "../systems/motion";
import { MeteorSystem } from "../systems/meteor";
import { LevelSystem } from "../systems/level";
import { BulletSystem } from "../systems/bullet";
import { CollisionSystem } from "../systems/collision";
import { store } from "../stores";

export function createGamePlay() {
    const scene = new Scene({
        updateableSystems: [
            new LevelSystem(store),
            new PlayerSystem(store),
            new MotionSystem(store),
            new MeteorSystem(store),
            new BulletSystem(store),
            new CollisionSystem(store),
        ],
        renderableSystems: [new RendererSystem(), new GUISystem()],
    });

    scene.createEntity(playerArchetype, getPlayerComponents());

    return scene;
}
