import { UpdateableSystemV2 } from "../../../cluster/ecs/system";
import { CommandBufferV2 } from "../../../cluster/ecs/cmdV2";
import { ViewV2 } from "../../../cluster/ecs/sceneV2";
import { meteorArchetype, getMeteorComponents } from "../entities/meteor";

const State = {
    level: 1,
    spawnInterval: 2,
    entitiesPerSpawn: 1,
};

export class LevelSystem implements UpdateableSystemV2 {
    private counter = State.spawnInterval;

    update(view: ViewV2, cmd: CommandBufferV2, dt: number) {
        this.counter -= dt;

        if (this.counter <= 0) {
            const meteorComponents = getMeteorComponents();

            cmd.create(meteorArchetype, meteorComponents);

            this.counter = State.spawnInterval;
        }
    }
}
