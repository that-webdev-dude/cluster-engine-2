import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { meteorArchetype, getMeteorComponents } from "../entities/meteor";
import { Store } from "../../../cluster";

const State = {
    spawnInterval: 1,
};

export class LevelSystem extends StorageUpdateSystem {
    private counter = State.spawnInterval;

    constructor(readonly store: Store) {
        super(store);

        store.on("playerHit", (e) => {
            store.dispatch("decrementLives", 1);
            if (store.get("lives") === 0) {
                store.emit({ type: "gameTitle" });
            }
        });
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        this.counter -= dt;

        if (this.counter <= 0) {
            const meteorComponents = getMeteorComponents();

            cmd.create(meteorArchetype, meteorComponents);

            this.counter = State.spawnInterval;
        }
    }
}
