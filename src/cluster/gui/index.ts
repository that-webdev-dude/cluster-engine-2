import { Container } from "../tools/Container";

// Base properties common to all GUI elements
interface GUIBase {
    position: { x: number; y: number };
    fill: string;
    dead: boolean;
    visible: boolean;
}

// Optional for text alignment and style
interface GUITextBase extends GUIBase {
    font: string;
    align: CanvasTextAlign;
    baseline: CanvasTextBaseline;
}

// GUIText: visible static string
interface GUIText extends GUITextBase {
    type: "GUIText";
    text: string;
}

// GUIStoredText: dynamic text (function returning string)
interface GUIStoredText extends GUITextBase {
    type: "GUIStoredText";
    text: () => string;
}

// GUIBackground: background box
interface GUIBackground extends GUIBase {
    type: "GUIBackground";
    width: number;
    height: number;
}

// Union type of all GUI elements
export type GUIElement = GUIText | GUIStoredText | GUIBackground;

// Container of GUI elements
export type GUIContainer = Container<GUIElement>;
