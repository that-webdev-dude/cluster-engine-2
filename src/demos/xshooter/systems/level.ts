import { ECSUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { meteorArchetype, getMeteorComponents } from "../entities/meteor";
import { Store } from "../../../cluster";
import { Input } from "../../../cluster";
import { MeteorDiedEvent, GamePauseEvent } from "../events";

const State = {
    spawnInterval: 1,
};

export class LevelSystem extends ECSUpdateSystem {
    private counter = State.spawnInterval;

    constructor(readonly store: Store) {
        super(store);

        store.on<MeteorDiedEvent>(
            "meteorDied",
            (e) => {
                // console.log("should dispach a score increase");
                store.dispatch("incrementScores", 1);
            },
            false
        );
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        this.counter -= dt;

        if (this.counter <= 0) {
            const meteorComponents = getMeteorComponents();

            cmd.create(meteorArchetype, meteorComponents);

            this.counter = State.spawnInterval;
        }

        if (Input.Keyboard.key("KeyP")) {
            const gamePauseEvent: GamePauseEvent = {
                type: "gamePause",
            };

            this.store.emit<GamePauseEvent>(gamePauseEvent, false);
        }
    }
}
