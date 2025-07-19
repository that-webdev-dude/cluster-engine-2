import { GUIUpdateSystem } from "../../../cluster/ecs/system";
import { Store } from "../../../cluster/core/Store";
import { store } from "../stores";
import { Keyboard } from "../input";
import { GUIContainer } from "../../../cluster/gui";
import { GamePlayEvent } from "../events";

export class TitleSystem extends GUIUpdateSystem {
    constructor(readonly store: Store) {
        super(store);
    }

    update(gui: GUIContainer, dt: number, t: number): void {
        // press enter to start the game
        if (Keyboard.key("Enter")) {
            Keyboard.active = false;

            this.store.emit({ type: "gamePlay" }, false);
        }
    }
}
