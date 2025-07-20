import { Store } from "../../../cluster";
import { GUIUpdateSystem } from "../../../cluster/ecs/system";
import { GUIContainer, GUIElement } from "../../../cluster/gui/GUIbuilders";

export class GUITimerSystem extends GUIUpdateSystem {
    private timer: number = 0;

    constructor(store: Store) {
        super(store);

        store.on("gamePlay", () => {
            this.timer = 0;
        });
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

    private formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    update(gui: GUIContainer, dt: number, t: number): void {
        const timerElements = this.findAllByTag(gui, "GUITimer");

        this.timer += dt;
        for (const el of timerElements) {
            if (el.elementType === "GUIText") {
                el.text = this.formatTime(this.timer);
            }
        }
    }
}
