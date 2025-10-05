import { GUIRenderSystem } from "../../../cluster/ecs/system";
import { Display } from "../../../cluster/core/Display";
import { GUIContainer, GUIElement } from "../../../cluster/gui/GUIbuilders";

export class GUISystem extends GUIRenderSystem {
    private readonly dynamicLayer =
        Display.getInstance().createCPURenderingLayer();
    private readonly context = this.dynamicLayer.getContext();

    private shouldRender(gui: GUIElement | GUIContainer): boolean {
        return gui.visible === true || gui.dead === false;
    }

    private setAlpha(gui: GUIElement | GUIContainer) {
        if (gui.alpha !== 1) {
            this.context.globalAlpha = gui.alpha;
        }
    }

    private setPosition(gui: GUIElement | GUIContainer) {
        if (gui.position.x !== 0 || gui.position.y !== 0) {
            this.context.translate(
                Math.round(gui.position.x),
                Math.round(gui.position.y)
            );
        }
    }

    private setOffset(gui: GUIElement | GUIContainer) {
        if (gui.offset.x !== 0 || gui.offset.y !== 0) {
            this.context.translate(gui.offset.x, gui.offset.y);
        }
    }

    private setScale(gui: GUIElement | GUIContainer) {
        if (gui.scale.x !== 1 || gui.scale.y !== 1) {
            this.context.scale(gui.scale.x, gui.scale.y);
        }
    }

    private setAngle(gui: GUIElement | GUIContainer) {
        let p = { x: 0, y: 0 };
        p.x = gui.pivot.x;
        p.y = gui.pivot.y;
        if (gui.angle !== 0) {
            this.context.translate(p.x, p.y);
            this.context.rotate(gui.angle);
            this.context.translate(-p.x, -p.y);
        }
    }

    private renderElement(gui: GUIElement) {
        if (!this.shouldRender(gui)) return;

        this.context.save();

        this.setAlpha(gui);
        this.setPosition(gui);
        this.setOffset(gui);
        this.setScale(gui);
        this.setAngle(gui);

        // draw the elements
        switch (gui.elementType) {
            case "GUIText":
                {
                    const { text, font, fill, baseline, align } = gui;
                    this.context.font = font;
                    this.context.fillStyle = fill;
                    this.context.textBaseline = baseline;
                    this.context.textAlign = align;
                    if (typeof text === "string") {
                        this.context.fillText(text, 0, 0);
                    } else {
                        this.context.fillText(text(), 0, 0); // fallback
                    }
                }
                break;

            case "GUIRect":
                {
                    const { width, height, fill } = gui;
                    this.context.fillStyle = fill;
                    this.context.fillRect(0, 0, width, height);
                }
                break;

            default: {
                throw new Error(
                    `Unknown GUIElement: ${(gui as any).elementType}`
                );
            }
        }

        this.context.restore();
    }

    private renderContainer(gui: GUIContainer) {
        if (gui.empty) return;

        if (!this.shouldRender(gui)) return;

        this.context.save();

        this.setAlpha(gui);
        this.setPosition(gui);
        this.setOffset(gui);
        this.setScale(gui);
        this.setAngle(gui);

        // traverse
        gui.children.forEach((child) => {
            if (child instanceof GUIContainer) {
                this.renderContainer(child);
            } else {
                this.renderElement(child as GUIElement);
            }
        });

        this.context.restore();
    }

    render(gui: GUIContainer): void {
        this.dynamicLayer.clear();

        this.renderContainer(gui);
    }

    public dispose(): void {
        this.dynamicLayer.destroy();
    }
}
