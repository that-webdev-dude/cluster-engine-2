import { Obj } from "../tools";

/**
 * constant definition for the fullscreen shortcut key.
 */
const FULLSCREEN_SHORTCUT = "KeyF";

/**
 * Display
 *
 * Responsible for creating and managing a canvas element for rendering graphics.
 */
export class Display {
    private static _instance: Display | null = null;
    private _parentID: string;
    private _canvas: HTMLCanvasElement = document.createElement("canvas");

    // initial CSS dimensions
    private _initialCssWidth: number;
    private _initialCssHeight: number;

    // device pixel ratio
    private _dpr: number = window.devicePixelRatio || 1;

    // aspect ratio (width / height)
    private _aspectRatio: number;

    // current CSS and buffer sizes
    private _cssWidth: number;
    private _cssHeight: number;
    private _bufWidth: number;
    private _bufHeight: number;

    // event handlers
    private _fullscreenHandler: (event: KeyboardEvent) => void = () => {};
    private _resizeHandler: () => void = () => {};

    // callback on resize
    public resizeCb: ((width: number, height: number) => void) | null = null;

    constructor({
        parentID = "body",
        width = 640,
        height = 384,
    }: {
        parentID?: string;
        width?: number;
        height?: number;
    }) {
        this._parentID = parentID;
        this._initialCssWidth = width;
        this._initialCssHeight = height;
        this._aspectRatio = width / height;

        // start CSS and buffer sizes equal to initial
        this._cssWidth = width;
        this._cssHeight = height;
        this._bufWidth = Math.floor(width * this._dpr);
        this._bufHeight = Math.floor(height * this._dpr);

        // insert canvas into DOM
        let appElement = document.querySelector(this._parentID) as HTMLElement;
        if (!appElement) {
            console.warn(
                `[Display]: Parent element with ID ${this._parentID} not found. Defaulting to body.`
            );
            appElement = document.body;
            this._parentID = "body";
        }

        // set initial buffer size
        this._canvas.width = this._bufWidth;
        this._canvas.height = this._bufHeight;

        // set initial CSS size
        this._canvas.style.display = "block";
        this._canvas.style.width = `${width}px`;
        this._canvas.style.height = `${height}px`;

        appElement.appendChild(this._canvas);

        this._initialize();
        Display._instance = this;
    }

    /**
     * Accessors for CSS and buffer dimensions
     */
    get view(): HTMLCanvasElement {
        return this._canvas;
    }
    get width(): number {
        return this._bufWidth;
    }
    get height(): number {
        return this._bufHeight;
    }
    get cssWidth(): number {
        return this._cssWidth;
    }
    get cssHeight(): number {
        return this._cssHeight;
    }
    get aspectRatio(): number {
        return this._aspectRatio;
    }
    get dpr(): number {
        return this._dpr;
    }

    private _initialize() {
        // fullscreen key handler
        this._fullscreenHandler = this._handleFullscreen.bind(this);
        document.addEventListener("keypress", this._fullscreenHandler);

        // resize handler (debounced)
        this._resizeHandler = Obj.debounce(this._handleResize.bind(this), 100);
        window.addEventListener("resize", this._resizeHandler);

        // initial sizing
        this._handleResize();
    }

    private _handleFullscreen(event: KeyboardEvent) {
        if (event.code === FULLSCREEN_SHORTCUT) {
            this._toggleFullScreen();
        }
    }

    private _handleResize() {
        // measure container and clamp to initial size
        const container = this.view.parentElement!.getBoundingClientRect();
        let w = Math.min(container.width, this._initialCssWidth);
        let h = w / this._aspectRatio;
        if (h > Math.min(container.height, this._initialCssHeight)) {
            h = Math.min(container.height, this._initialCssHeight);
            w = h * this._aspectRatio;
        }

        // update CSS size
        this._cssWidth = w;
        this._cssHeight = h;
        this._canvas.style.width = `${w}px`;
        this._canvas.style.height = `${h}px`;

        // update buffer size
        const pw = Math.floor(w * this._dpr);
        const ph = Math.floor(h * this._dpr);
        this._canvas.width = pw;
        this._canvas.height = ph;
        this._bufWidth = pw;
        this._bufHeight = ph;

        // notify renderer
        this.resizeCb?.(pw, ph);
    }

    private _toggleFullScreen() {
        if (!document.fullscreenElement) {
            this._canvas.requestFullscreen();
        } else {
            document.exitFullscreen?.();
        }
    }

    public destroy() {
        document.removeEventListener("keypress", this._fullscreenHandler);
        window.removeEventListener("resize", this._resizeHandler);
        const parent = document.querySelector(this._parentID);
        if (parent && this._canvas) {
            parent.removeChild(this._canvas);
        } else {
            console.warn(
                `[Display]: Parent element with ID ${this._parentID} not found. Cannot remove canvas.`
            );
        }
        (this._canvas as unknown) = null;
    }

    public static getInstance(): Display {
        if (!Display._instance) {
            Display._instance = new Display({});
        }
        return Display._instance;
    }
}
