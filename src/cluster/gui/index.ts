import { Container } from "../tools/Container";

// type GUILayout {

// }

type GUIStyle = {
    fill: string;
};

type GUIText = GUIStyle & {
    type: "GUIText";
    position: { x: number; y: number };
    font: string;
    // fill: string;
    baseline: CanvasTextBaseline;
    text: () => string;
    dead: boolean;
    visible: boolean;
};

type GUIBackground = GUIStyle & {
    type: "GUIBackground";
    position: { x: number; y: number };
    width: number;
    height: number;
    // fill: string;
    dead: boolean;
    visible: boolean;
};

export type GUIElement = GUIText | GUIBackground;

export type GUIContainer = Container<GUIElement>;
