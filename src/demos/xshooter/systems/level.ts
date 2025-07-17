import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { meteorArchetype, getMeteorComponents } from "../entities/meteor";

const State = {
    level: 1,
    spawnInterval: 1,
    entitiesPerSpawn: 1,
};

export class LevelSystem extends StorageUpdateSystem {
    private counter = State.spawnInterval;

    update(view: View, cmd: CommandBuffer, dt: number) {
        this.counter -= dt;

        if (this.counter <= 0) {
            const meteorComponents = getMeteorComponents();

            cmd.create(meteorArchetype, meteorComponents);

            this.counter = State.spawnInterval;
        }
    }
}
