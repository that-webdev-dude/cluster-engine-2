import { RenderableSystem } from "../../../cluster/ecs/system";
import { Display } from "../../../cluster/core/Display";

export class GUISystem implements RenderableSystem {
    // grab the singleton Display and make a CPU layer
    private layer = Display.getInstance().createCPURenderingLayer();

    render(): void {
        // 1) Clear the offscreen buffer
        this.layer.clear();

        // 2) Draw your HUD text
        const ctx = this.layer.getContext();
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "green";
        ctx.textBaseline = "top";
        ctx.fillText("Scores: 0", 10, 10);

        // 3) (Optional) you can composite immediately, or let Display.render() do it later
        // Display.getInstance().transferRenderingLayer(this.layer);
    }
}
