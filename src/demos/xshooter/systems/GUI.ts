import { RenderableSystem } from "../../../cluster/ecs/system";
import { Display } from "../../../cluster/core/Display";
import { Store } from "../../../cluster/core/Store";
import { Event } from "../../../cluster/core/Emitter";

export class GUISystem extends RenderableSystem {
    // grab the singleton Display and make a CPU layer
    private layer = Display.getInstance().createCPURenderingLayer();
    private scores: number = 0;

    constructor(store: Store) {
        super(store);

        this.store.on("scoreEvent", (event: Event) => {
            this.scores = this.store.get("scores");
        });
    }

    render(): void {
        // 1) Clear the offscreen buffer
        this.layer.clear();

        // 2) Draw your HUD text
        const ctx = this.layer.getContext();
        ctx.font = '14px "Press Start 2P"';
        ctx.fillStyle = "white";
        ctx.textBaseline = "top";
        ctx.fillText(`Hits: ${this.scores}`, 10, 10);
    }
}
