import { GLOBALS } from "../globals";
import { GUIElement } from "../../../cluster/gui";
import { Store } from "../../../cluster/core/Store";

export class GUIEntity {
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
