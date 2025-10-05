import { ECSUpdateSystem } from "../../../cluster/ecs/system";
import { Store, Input } from "../../../cluster";
import { GameResumeEvent } from "../events";

export class PauseSystem extends ECSUpdateSystem {
    constructor(readonly store: Store) {
        super(store);
    }

    update() {
        if (Input.Keyboard.key("KeyR")) {
            this.store.emit<GameResumeEvent>({ type: "gameResume" }, false);
        }
    }

    public dispose(): void {
        // stateless system
    }
}
