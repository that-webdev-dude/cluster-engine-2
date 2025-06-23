import { Scene } from "../../../cluster/ecs/scene";
import { RendererSystem } from "../systems/renderer";
import { PlayerSystem } from "../systems/player";
import { createPlayer } from "../entities/player";

export function createGamePlay() {
    const scene = new Scene({
        updateableSystems: [new PlayerSystem()],
        renderableSystems: [new RendererSystem()],
    });

    createPlayer(scene);

    return scene;
}
