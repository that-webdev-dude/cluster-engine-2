import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { Store } from "../../../cluster";
import { Input } from "../../../cluster";
import { GLOBALS } from "../globals";
import { GameResumeEvent } from "../events";

export class PauseSystem extends StorageUpdateSystem {
    constructor(readonly store: Store) {
        super(store);
    }

    update() {
        if (Input.Keyboard.key("KeyR")) {
            this.store.emit<GameResumeEvent>({ type: "gameResume" }, false);
        }
    }
}
