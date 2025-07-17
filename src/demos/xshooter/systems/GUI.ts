import { GUIRenderSystem } from "../../../cluster/ecs/system";
import { Display } from "../../../cluster/core/Display";
import { GUIContainer } from "../../../cluster/gui";

export class GUISystem extends GUIRenderSystem {
    // grab the singleton Display and make a CPU layer
    private layer = Display.getInstance().createCPURenderingLayer();

    renderContainer(
        ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
        guiContainer: GUIContainer
    ) {
        guiContainer.forEach((guiElement) => {
            if ("type" in guiElement) {
                // It's a GUIComponent (GUIElement)
                switch (guiElement.type) {
                    case "GUIText": {
                        const { text, font, fill, baseline, position } =
                            guiElement;
                        ctx.font = font;
                        ctx.fillStyle = fill;
                        ctx.textBaseline = baseline;
                        ctx.fillText(text(), position.x, position.y);
                        break;
                    }
                    case "GUIBackground": {
                        const { position, width, height, fill } = guiElement;
                        ctx.fillStyle = fill;
                        ctx.fillRect(position.x, position.y, width, height);
                        break;
                    }
                    default:
                        break;
                }
            } else if (typeof guiElement.forEach === "function") {
                // It's a Container<GUIComponent>
                guiElement.forEach((child) => {
                    this.renderContainer(ctx, child as GUIContainer);
                });
            }
        });
    }

    render(GUI: GUIContainer): void {
        this.layer.clear();

        const ctx = this.layer.getContext();

        this.renderContainer(ctx, GUI);
    }
}
