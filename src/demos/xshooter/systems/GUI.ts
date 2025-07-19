import { GUIRenderSystem } from "../../../cluster/ecs/system";
import { CPURenderingLayer, Display } from "../../../cluster/core/Display";
import { GUIContainer } from "../../../cluster/gui";

export class GUISystem extends GUIRenderSystem {
    // grab the singleton Display and make a CPU layer
    private dynamicLayer: CPURenderingLayer =
        Display.getInstance().createCPURenderingLayer();
    // private staticLayer: CPURenderingLayer | null = null; // maybe later let's take it easy now

    // preRUN?

    renderContainer(
        ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
        guiContainer: GUIContainer
    ) {
        guiContainer.forEach((guiElement) => {
            if ("dead" in guiElement && guiElement.dead === true) {
                return;
            }

            if ("visible" in guiElement && guiElement.visible === false) {
                return;
            }

            if ("type" in guiElement) {
                // It's a GUIComponent (GUIElement)
                switch (guiElement.type) {
                    case "GUIText": {
                        const { text, font, fill, baseline, position, align } =
                            guiElement;
                        ctx.font = font;
                        ctx.fillStyle = fill;
                        ctx.textBaseline = baseline;
                        ctx.textAlign = align;
                        ctx.fillText(text, position.x, position.y);
                        break;
                    }
                    case "GUIStoredText": {
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
                    default: {
                        const _exhaustiveCheck: never = guiElement;
                        throw new Error(
                            `Unknown GUIElement type: ${
                                (guiElement as any).type
                            }`
                        );
                    }
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
        this.dynamicLayer.clear();

        const ctx = this.dynamicLayer.getContext();

        this.renderContainer(ctx, GUI);
    }
}
