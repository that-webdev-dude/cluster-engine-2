import { GLOBALS } from "../globals";
import { GUIElement } from "../../../cluster/gui";
import { Store } from "../../../cluster/core/Store";

type Vec2 = { x: number; y: number };

interface GUITextOptions {
    position?: Vec2;
    fill?: string;
    text?: string;
    size?: number;
}

interface GUIStoredTextOptions {
    position?: Vec2;
    fill?: string;
    storedKey?: string;
}

export class GUIEntity {
    private static textDefaults: Required<GUITextOptions> = {
        position: { x: 0, y: 0 },
        fill: "white",
        text: "text",
        size: 16,
    };

    private static storedTextDefaults: Required<GUIStoredTextOptions> = {
        position: { x: 0, y: 0 },
        fill: "white",
        storedKey: "",
    };

    static staticText(options?: GUITextOptions): GUIElement {
        const { position, fill, text, size } = {
            ...GUIEntity.textDefaults,
            ...options,
        };

        return {
            type: "GUIText",
            dead: false,
            visible: true,
            position,
            font: `${size}px "Press Start 2P"`,
            fill,
            baseline: "top",
            align: "center",
            text,
        };
    }

    static storedText(
        store: Store,
        options?: GUIStoredTextOptions
    ): GUIElement {
        const { position, fill, storedKey } = {
            ...GUIEntity.storedTextDefaults,
            ...options,
        };

        return {
            type: "GUIStoredText",
            dead: false,
            visible: true,
            position,
            font: '14px "Press Start 2P"',
            align: "center",
            fill,
            baseline: "top",
            text: () => (store && storedKey ? store.get(storedKey) : ""),
        };
    }

    static background(fill = "transparent"): GUIElement {
        return {
            type: "GUIBackground",
            dead: false,
            visible: true,
            position: { x: 0, y: 0 },
            width: GLOBALS.worldW,
            height: GLOBALS.worldH,
            fill,
        };
    }
}
