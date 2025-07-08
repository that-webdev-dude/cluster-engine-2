import { SceneV2 } from "../../../cluster/ecs/sceneV2";
import { playerArchetype, getPlayerComponents } from "../entities/player";
import { RendererSystem } from "../systems/renderer";
import { PlayerSystem } from "../systems/player";
import { MotionSystem } from "../systems/motion";
import { MeteorSystem } from "../systems/meteor";
import { LevelSystem } from "../systems/level";
import { BulletSystem } from "../systems/bullet";
import { CollisionSystem } from "../systems/collision";

export function createGamePlay() {
    const scene = new SceneV2({
        updateableSystems: [
            new LevelSystem(),
            new PlayerSystem(),
            new MotionSystem(),
            new MeteorSystem(),
            new BulletSystem(),
            new CollisionSystem(),
        ],
        renderableSystems: [new RendererSystem()],
    });

    scene.createEntity(playerArchetype, getPlayerComponents());

    return scene;
}
