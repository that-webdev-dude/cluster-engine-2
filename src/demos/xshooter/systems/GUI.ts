import { RenderableSystem } from "../../../cluster/ecs/system";
import { Display } from "../../../cluster/core/Display";
import { Store } from "../../../cluster/core/Store";
import { Event } from "../../../cluster/core/Emitter";
import { Container } from "../../../cluster/tools/Container";
import { GUIElement, GUIContainer } from "../../../cluster/gui";
import { GLOBALS } from "../globals";
import { store } from "../stores";

const GUI = new Container<GUIElement>();

class GUIEntity {
    static text(store?: Store): GUIElement {
        return {
            type: "GUIText",
            dead: false,
            visible: true,
            position: {
                x: 10,
                y: 10,
            },
            font: '14px "Press Start 2P"',
            fill: "red",
            baseline: "top",
            text: () => {
                if (store) {
                    return store.get("scores");
                }
                return "0";
            },
        };
    }

    static background(): GUIElement {
        return {
            type: "GUIBackground",
            dead: false,
            visible: true,
            position: {
                x: 0,
                y: 0,
            },
            width: GLOBALS.worldW,
            height: GLOBALS.worldH,
            fill: "transparent",
        };
    }
}

GUI.add(GUIEntity.text(store));
GUI.add(GUIEntity.background());

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

    render(): void {
        this.layer.clear();

        const ctx = this.layer.getContext();

        this.renderContainer(ctx, GUI);
    }
}
