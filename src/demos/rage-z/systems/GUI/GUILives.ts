import { Store } from "../../../../cluster";
import { GUIUpdateSystem } from "../../../../cluster/ecs/system";
import { GUIContainer, GUIElement } from "../../../../cluster/gui/GUIbuilders";

export class GUILivesSystem extends GUIUpdateSystem {
    // private timer: number = 0;

    constructor(store: Store) {
        super(store);
    }

    private findAllByTag(
        gui: GUIContainer | GUIElement,
        tag: string,
        out: GUIElement[] = []
    ): GUIElement[] {
        if (gui.tag === tag && "elementType" in gui) {
            out.push(gui as GUIElement);
        }

        if (gui instanceof GUIContainer) {
            for (const child of gui.children) {
                this.findAllByTag(child as GUIContainer, tag, out);
            }
        }

        return out;
    }

    update(gui: GUIContainer, dt: number, t: number): void {
        const lifeElements = this.findAllByTag(gui, "GUILife");
        const lives = this.store!.get("lives");
        if (lifeElements.length > lives) {
            const lastLife = lifeElements.pop();
            if (lastLife) {
                lastLife.dead = true;
                gui.remove(lastLife);
            }
        }
    }
}
