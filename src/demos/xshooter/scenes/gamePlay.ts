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
import { GUIEntity } from "../gui";
import { store } from "../stores";

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
        guiRenderSystems: [new GUISystem()],
    });

    scene.createEntity(playerArchetype, getPlayerComponents());

    scene.gui.add(GUIEntity.text(store));
    scene.gui.add(GUIEntity.background());

    return scene;
}
