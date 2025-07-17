import { Container } from "../tools/Container";

export type GUIElement = {
    [key: string]: any; // Allows extra properties of any type
    type: string;
    dead: boolean;
    position: {
        x: number;
        y: number;
    };
    visible: boolean;
    update?(dt: number, t?: number): Function;
};

export type GUIContainer = Container<GUIElement>;
