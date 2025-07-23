import { Container } from "../tools";

type Vec2 = { x: number; y: number };

interface GUIBase {
    index: number;
    tag: string;
    dead: boolean;
    visible: boolean;
    position: Vec2;
    offset: Vec2;
    scale: Vec2;
    pivot: Vec2;
    angle: number;
    alpha: number;
    background: string;
}

type DynamicValue<T> = T | ((...args: any[]) => T);

export interface GUITextElement extends GUIBase {
    elementType: "GUIText";
    text: DynamicValue<string>;
    font: string;
    fill: string;
    baseline: CanvasTextBaseline;
    align: CanvasTextAlign;
}

export interface GUIRectElement extends GUIBase {
    elementType: "GUIRect";
    width: number;
    height: number;
    fill: string;
}

// Add more element types as needed...
export type GUIElement = GUITextElement | GUIRectElement;

export type GUIBuilder = (el: Partial<GUIElement>) => Partial<GUIElement>;

export const withIndex = (index: number): GUIBuilder => {
    return (el) => ({ ...el, index });
};

export const withTag = (tag: string): GUIBuilder => {
    return (el) => ({ ...el, tag });
};

export const withDeadState = (dead: boolean): GUIBuilder => {
    return (el) => ({ ...el, dead });
};

export const withVisibility = (visible: boolean): GUIBuilder => {
    return (el) => ({ ...el, visible });
};

export const withPosition = (x: number, y: number): GUIBuilder => {
    return (el) => ({ ...el, position: { x, y } });
};

export const withOffset = (x: number, y: number): GUIBuilder => {
    return (el) => ({ ...el, offset: { x, y } });
};

export const withScale = (x: number, y: number): GUIBuilder => {
    return (el) => ({ ...el, scale: { x, y } });
};

export const withPivot = (x: number, y: number): GUIBuilder => {
    return (el) => ({ ...el, pivot: { x, y } });
};

export const withAngle = (angle: number): GUIBuilder => {
    return (el) => ({ ...el, angle });
};

export const withText = (text: string | DynamicValue<string>): GUIBuilder => {
    return (el) => ({ ...el, text });
};

export const withFont = (font: string): GUIBuilder => {
    return (el) => ({ ...el, font });
};

export const withFill = (fill: string): GUIBuilder => {
    return (el) => ({ ...el, fill });
};

export const withAlign = (align: CanvasTextAlign): GUIBuilder => {
    return (el) => ({ ...el, align });
};

export const withBaseline = (baseline: CanvasTextBaseline): GUIBuilder => {
    return (el) => ({ ...el, baseline });
};

export const withWidth = (width: number): GUIBuilder => {
    return (el) => ({ ...el, width });
};

export const withHeight = (height: number): GUIBuilder => {
    return (el) => ({ ...el, height });
};

export const withAlpha = (alpha: number): GUIBuilder => {
    return (el) => ({ ...el, alpha });
};

export const createGUIText = (
    text: string,
    font: string,
    fill: string
): GUIBuilder => {
    return (el) => ({
        ...el,
        elementType: "GUIText",
        text,
        font,
        fill,
        baseline: "middle",
        align: "center",
    });
};

export const createGUIRect = (
    width: number,
    height: number,
    fill: string
): GUIBuilder => {
    return (el) => ({
        ...el,
        elementType: "GUIRect",
        width,
        height,
        fill,
    });
};

export function composeGUI<T extends GUIElement>(...builders: GUIBuilder[]): T {
    const base: GUIBase = {
        index: 0,
        tag: "",
        dead: false,
        visible: true,
        position: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        pivot: { x: 0, y: 0 },
        angle: 0,
        alpha: 1,
        background: "transparent",
    };

    const result = builders.reduce<Partial<GUIBase>>(
        (acc, builder) => builder(acc),
        base
    );

    return result as T;
}

/**
 * GUIContainer is a specialized Container for GUI elements.
 * It extends the generic Container class to hold GUIElement types.
 */
export interface GUIContainerOptions {
    index?: number;
    tag?: string;
    dead?: boolean;
    visible?: boolean;
    position?: Vec2;
    offset?: Vec2;
    scale?: Vec2;
    pivot?: Vec2;
    angle?: number;
    alpha?: number;
    background?: string;
}
export class GUIContainer extends Container<GUIElement> implements GUIBase {
    elementType = "GUIContainer";
    index = 0;
    tag = "";
    dead = false;
    visible = true;
    position = { x: 0, y: 0 };
    offset = { x: 0, y: 0 };
    scale = { x: 1, y: 1 };
    pivot = { x: 0, y: 0 };
    angle = 0;
    alpha = 1;
    background = "transparent";

    constructor(options: GUIContainerOptions = {}) {
        super();
        this.index = options.index || 0;
        this.tag = options.tag || "";
        this.dead = options.dead || false;
        this.visible = options.visible || true;
        this.position = options.position || { x: 0, y: 0 };
        this.offset = options.offset || { x: 0, y: 0 };
        this.scale = options.scale || { x: 1, y: 1 };
        this.pivot = options.pivot || { x: 0, y: 0 };
        this.angle = options.angle || 0;
        this.alpha = options.alpha || 1;
        this.background = options.background || "transparent";
    }
}
