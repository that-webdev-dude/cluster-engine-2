import { GUIUpdateSystem } from "../../../cluster/ecs/system";
import { Store } from "../../../cluster/core/Store";
import { Keyboard } from "../input";
import { GUIContainer } from "../../../cluster/gui/GUIbuilders";

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

    public dispose(): void {
        // nothing to clean for title system
    }
}
