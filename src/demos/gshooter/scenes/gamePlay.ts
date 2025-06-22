import { Scene } from "../../../cluster/ecs/scene";
import { RendererSystem } from "../systems/renderer";
import { createPlayer } from "../entities/player";

export function createGamePlay() {
    const scene = new Scene({
        updateableSystems: [],
        renderableSystems: [new RendererSystem()],
    });

    createPlayer(scene);

    return scene;
}
