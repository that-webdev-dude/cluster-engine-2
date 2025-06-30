import { Scene } from "../../../cluster/ecs/scene";
import { RendererSystem } from "../systems/renderer";
import { PlayerSystem } from "../systems/player";
import { MeteorSystem } from "../systems/meteor";
import { MotionSystem } from "../systems/motion";
import { createPlayer } from "../entities/player";
import { createMeteor } from "../entities/meteor";

export function createGamePlay() {
    const scene = new Scene({
        updateableSystems: [
            new PlayerSystem(),
            new MeteorSystem(),
            new MotionSystem(),
        ],
        renderableSystems: [new RendererSystem()],
    });

    createPlayer(scene);
    console.log(scene.components);
    createMeteor(scene);
    console.log(scene.components);

    return scene;
}
