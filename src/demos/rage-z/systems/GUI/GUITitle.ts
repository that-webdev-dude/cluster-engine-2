import { GUIUpdateSystem, Input, GUIContainer } from "../../../../cluster";
import { Store } from "../../../../cluster/core/Store";

export class GUITitleSystem extends GUIUpdateSystem {
    constructor(readonly store: Store) {
        super(store);
    }

    update(gui: GUIContainer, dt: number, t: number): void {
        // press enter to start the game
        if (Input.Keyboard.key("Enter")) {
            Input.Keyboard.active = false;
            this.store.emit({ type: "gamePlay" }, false);
        }
    }
}
