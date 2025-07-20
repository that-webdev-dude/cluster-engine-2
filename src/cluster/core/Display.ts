import { Cmath } from "../tools";
import { Obj } from "../tools";

type RGBA = { r: number; g: number; b: number; a: number };

interface DisplayOptions {
    width?: number;
    height?: number;
    parent?: string | HTMLElement;
    backgroundColor: RGBA;
}

interface RenderingLayer {
    resize(width: number, height: number): void;
    clear(): void;
    getCanvas(): OffscreenCanvas | HTMLCanvasElement;
}

interface RenderingLayerOptions extends Omit<DisplayOptions, "parent"> {
    antialias?: boolean;
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
}

/**
 * Manages the main display canvas for 2D and GPU-accelerated rendering.
 * Handles canvas creation, resizing, fullscreen toggling, and rendering layers.
 * Supports high-DPI displays and background color configuration.
 *
 * @remarks
 * - Automatically attaches to a parent DOM element or defaults to `<body>`.
 * - Maintains a set of rendering layers (CPU/GPU) for compositing.
 * - Provides methods for clearing, resizing, rendering, and cleanup.
 */
export class Display {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private optsW: number;
    private optsH: number;
    private bufW: number;
    private bufH: number;
    private cssW: number;
    private cssH: number;
    private aspectRatio: number;
    private backgroundColor: RGBA;
    private renderingLayers: Set<RenderingLayer> = new Set();

    private static instance: Display;

    // listeners
    private onFullscreenChangeBound = this.onFullscreenChange.bind(this);

    private onFullscreenKeyBound = this.onFullscreenKey.bind(this);

    private onScreenResizeBound = Obj.debounce(this.onResize.bind(this), 100);

    private constructor(opts: Required<DisplayOptions>) {
        if (opts.width <= 0 || opts.height <= 0) {
            throw new Error(
                "[Display.constructor]: width and height must be positive numbers."
            );
        }

        const { r, g, b, a } = opts.backgroundColor;
        this.backgroundColor = {
            r: Cmath.to255(r),
            g: Cmath.to255(g),
            b: Cmath.to255(b),
            a: Cmath.clamp(a, 0, 1),
        };
        this.aspectRatio = opts.width / opts.height;
        this.optsW = opts.width;
        this.optsH = opts.height;

        const DPR = window.devicePixelRatio || 1;
        this.bufW = Math.floor(opts.width * DPR);
        this.bufH = Math.floor(opts.height * DPR);
        this.cssW = opts.width;
        this.cssH = opts.height;

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.bufW;
        this.canvas.height = this.bufH;
        this.canvas.style.width = `${opts.width}px`;
        this.canvas.style.height = `${opts.height}px`;
        this.canvas.style.position = "absolute";

        const parent = this.resolveParent(opts.parent);
        parent.appendChild(this.canvas);

        const ctx = this.canvas.getContext("2d", { alpha: true });
        if (!ctx) {
            throw new Error(
                "[Display.constructor]: 2D context not supported by this browser."
            );
        }

        ctx.scale(DPR, DPR); // scale for high-DPI displays
        this.ctx = ctx;

        this.ctx.imageSmoothingEnabled = false;

        this.initialize();

        Display.instance = this;
    }

    get canvasElement(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Internal buffer width for rendering - Actual pixel resolution of the canvas
     */
    get width(): number {
        return this.bufW;
    }

    /**
     * Internal buffer height for rendering - Actual pixel resolution of the canvas
     */
    get height(): number {
        return this.bufH;
    }

    /**
     * How wide the canvas looks in the DOM
     */
    get cssWidth(): number {
        return this.cssW;
    }

    /**
     * How tall the canvas looks in the DOM
     */
    get cssHeight(): number {
        return this.cssH;
    }

    /**
     * local width - Game’s coordinate system / virtual resolution
     */
    get worldWidth(): number {
        return this.optsW;
    }

    /**
     * local height - Game’s coordinate system / virtual resolution
     */
    get worldHeight(): number {
        return this.optsH;
    }

    /**
     * Returns the shared Renderer instance, creating it if needed.
     */
    public static getInstance(options?: DisplayOptions): Display {
        if (!this.instance) {
            const defaults: Required<DisplayOptions> = {
                width: 640,
                height: 384,
                parent: "#app",
                backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
            };
            const opts = { ...defaults, ...options };
            this.instance = new Display(opts);
        }

        return this.instance;
    }

    public createGPURenderingLayer(hidden: boolean = false) {
        const layer = new GPURenderingLayer({
            width: this.bufW,
            height: this.bufH,
            alpha: true,
            depth: false,
            stencil: false,
            antialias: true,
            backgroundColor: this.backgroundColor,
        });

        if (!hidden) this.renderingLayers.add(layer);
        return layer;
    }

    public createCPURenderingLayer(hidden: boolean = false): CPURenderingLayer {
        const layer = new CPURenderingLayer({
            width: this.bufW,
            height: this.bufH,
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            backgroundColor: this.backgroundColor,
        });

        if (!hidden) this.renderingLayers.add(layer);
        return layer;
    }

    public transferRenderingLayer(layer: RenderingLayer) {
        const srcCanvas = layer.getCanvas();
        this.ctx.drawImage(srcCanvas, 0, 0, this.bufW, this.bufH);
    }

    public createRenderingLayer(
        type: "gpu" | "cpu",
        hidden: boolean = false
    ): RenderingLayer {
        if (type === "gpu") {
            return this.createGPURenderingLayer(hidden);
        }
        return this.createCPURenderingLayer(hidden);
    }

    public clear(): void {
        this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
        this.setBackgroundColor();
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight); // fill with background
    }

    public destroy(): void {
        window.removeEventListener("resize", this.onScreenResizeBound);
        document.removeEventListener("keydown", this.onFullscreenKeyBound);
        document.removeEventListener(
            "fullscreenchange",
            this.onFullscreenChangeBound
        );
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }

        // destroy the rendering layers
        this.destroyRenderingLayers();
    }

    public destroyRenderingLayers() {
        for (const layer of this.renderingLayers) {
            if ("destroy" in layer && typeof layer.destroy === "function") {
                layer.destroy();
            }
        }
        this.renderingLayers.clear();
    }

    public render() {
        this.clear();
        for (const layer of this.renderingLayers) {
            this.transferRenderingLayer(layer);
            layer.clear();
        }
    }

    private resolveParent(
        parent: string | HTMLElement | undefined
    ): HTMLElement {
        if (typeof parent === "string") {
            const el = document.querySelector(parent) as HTMLElement | null;
            if (!el) {
                console.warn(
                    `[Display.resolveParent]: Parent selector "${parent}" not found — defaulting to <body>.`
                );
                return document.body;
            }
            return el;
        } else if (parent instanceof HTMLElement) {
            return parent;
        } else {
            console.warn(
                "[Display.resolveParent]: Parent element invalid — defaulting to <body>."
            );
            return document.body;
        }
    }

    public setBackgroundColor(rgba?: RGBA): void {
        const c = rgba || this.backgroundColor;
        this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
        if (rgba) {
            this.backgroundColor = rgba;
        }
    }

    private initialize(): void {
        window.addEventListener("resize", this.onScreenResizeBound);
        document.addEventListener("keydown", this.onFullscreenKeyBound);
        document.addEventListener(
            "fullscreenchange",
            this.onFullscreenChangeBound
        );
        this.onResize();
    }

    private onResize(): void {
        const rect = this.canvas.parentElement?.getBoundingClientRect();
        if (!rect) return;
        let w = Math.min(rect.width, this.optsW);
        let h = w / this.aspectRatio;
        if (h > Math.min(rect.height, this.optsH)) {
            h = Math.min(rect.height, this.optsH);
            w = h * this.aspectRatio;
        }

        const DPR = window.devicePixelRatio || 1;
        this.bufW = Math.floor(w * DPR);
        this.bufH = Math.floor(h * DPR);
        this.cssW = w;
        this.cssH = h;

        this.canvas.width = this.bufW;
        this.canvas.height = this.bufH;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        this.ctx.scale(DPR, DPR);

        // don't actually need to resize the layers! this would be a fixed res display
        // for (const layer of this.renderingLayers) {
        //     // layer.resize(this.bufW, this.bufH);
        // }
        this.clear();
    }

    private onFullscreenKey(e: KeyboardEvent): void {
        if (e.code === "KeyF") {
            if (!document.fullscreenElement) {
                this.canvas
                    .requestFullscreen()
                    .catch((err) =>
                        console.error(
                            `[Display]: Fullscreen failed: ${err.message}`
                        )
                    );
            } else {
                document.exitFullscreen();
            }
        }
    }

    private onFullscreenChange(): void {
        this.onResize();
    }
}

export class GPURenderingLayer implements RenderingLayer {
    public readonly type: string = "gpu";
    public readonly gl: WebGL2RenderingContext;

    private canvas: OffscreenCanvas | HTMLCanvasElement;
    private optsW: number;
    private optsH: number;
    private aspectRatio: number;
    private backgroundColor: RGBA;

    private stencilTestEnabled: boolean;
    private depthTestEnabled: boolean;
    private clearDepth: boolean;
    private clearStencil: boolean;
    private contextRestoredCallbacks: Array<() => void> = [];

    // listeners
    private handleContextLostBound = this.handleContextLost.bind(this);

    private handleContextRestoredBound = this.handleContextRestored.bind(this);

    constructor(opts: Required<RenderingLayerOptions>) {
        this.optsW = opts.width;
        this.optsH = opts.height;

        const canvas =
            typeof OffscreenCanvas !== "undefined"
                ? new OffscreenCanvas(opts.width, opts.height)
                : document.createElement("canvas");

        const ctx = canvas.getContext("webgl2", {
            antialias: opts.antialias,
            alpha: opts.alpha,
            depth: opts.depth,
            stencil: opts.stencil,
        });

        if (!ctx) {
            throw new Error(
                "[GLRenderer]: WebGL2 not supported by this browser."
            );
        }

        this.canvas = canvas;
        this.gl = ctx as WebGL2RenderingContext;

        const { r, g, b, a } = opts.backgroundColor;
        this.backgroundColor = {
            r: Cmath.to255(r),
            g: Cmath.to255(g),
            b: Cmath.to255(b),
            a: Cmath.to255(a),
        };

        this.aspectRatio = opts.width / opts.height;
        this.optsW = opts.width;
        this.optsH = opts.height;

        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.STENCIL_TEST);

        this.clearDepth = opts.depth;
        this.clearStencil = opts.stencil;
        this.depthTestEnabled = false;
        this.stencilTestEnabled = false;

        this.initialize();

        this.setBackgroundColor();
    }

    get width(): number {
        return this.canvas.width;
    }

    get height(): number {
        return this.canvas.height;
    }

    get worldWidth() {
        return this.optsW;
    }

    get worldHeight() {
        return this.optsH;
    }

    public getCanvas(): OffscreenCanvas | HTMLCanvasElement {
        return this.canvas;
    }

    public getContext() {
        return this.gl;
    }

    private initialize() {
        this.canvas.addEventListener(
            "webglcontextlost",
            this.handleContextLostBound
        );
        this.canvas.addEventListener(
            "webglcontextrestored",
            this.handleContextRestoredBound
        );
    }

    public resize(bufW: number, bufH: number) {
        if (!this.gl) return;
        this.canvas.width = bufW;
        this.canvas.height = bufH;

        this.gl.viewport(0, 0, bufW, bufH);
        this.clear();
    }

    public clear(): void {
        let mask = this.gl.COLOR_BUFFER_BIT;
        if (this.clearDepth) mask |= this.gl.DEPTH_BUFFER_BIT;
        if (this.clearStencil) mask |= this.gl.STENCIL_BUFFER_BIT;
        this.gl.clear(mask);
    }

    public destroy(): void {
        this.canvas.removeEventListener(
            "webglcontextlost",
            this.handleContextLostBound
        );
        this.canvas.removeEventListener(
            "webglcontextrestored",
            this.handleContextRestoredBound
        );
    }

    public setDepthTest(enabled: boolean): void {
        this.depthTestEnabled = enabled;
        enabled
            ? this.gl.enable(this.gl.DEPTH_TEST)
            : this.gl.disable(this.gl.DEPTH_TEST);
    }

    public setStencilTest(enabled: boolean): void {
        this.stencilTestEnabled = enabled;
        enabled
            ? this.gl.enable(this.gl.STENCIL_TEST)
            : this.gl.disable(this.gl.STENCIL_TEST);
    }

    public setClearDepth(enabled: boolean): void {
        this.clearDepth = enabled;
    }

    public setClearStencil(enabled: boolean): void {
        this.clearStencil = enabled;
    }

    public getExtension(name: string): any {
        return this.gl.getExtension(name);
    }

    public hasExtension(name: string): boolean {
        return !!this.gl.getExtension(name);
    }

    public onContextRestored(callback: () => void): void {
        this.contextRestoredCallbacks.push(callback);
    }

    public offContextRestored(callback: () => void): void {
        const i = this.contextRestoredCallbacks.indexOf(callback);
        if (i !== -1) this.contextRestoredCallbacks.splice(i, 1);
    }

    private setBackgroundColor(): void {
        const c = this.backgroundColor;
        this.gl.clearColor(c.r / 255, c.g / 255, c.b / 255, c.a / 255);
    }

    private handleContextLost(e: Event): void {
        e.preventDefault();
        console.warn("[GLRenderer]: WebGL context lost.");
    }

    private handleContextRestored(): void {
        console.info(
            "[GLRenderer]: Context restored — reinitializing resources."
        );
        this.contextRestoredCallbacks.forEach((cb) => cb());
    }
}

export class CPURenderingLayer implements RenderingLayer {
    public readonly type: string = "cpu";
    public readonly ctx:
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D;

    private canvas: OffscreenCanvas | HTMLCanvasElement;
    private optsW: number;
    private optsH: number;
    private backgroundColor: RGBA;

    constructor(opts: Required<RenderingLayerOptions>) {
        this.optsW = opts.width;
        this.optsH = opts.height;

        // create either an OffscreenCanvas or regular <canvas>
        this.canvas =
            typeof OffscreenCanvas !== "undefined"
                ? new OffscreenCanvas(opts.width, opts.height)
                : document.createElement("canvas");

        let ctx2d:
            | CanvasRenderingContext2D
            | OffscreenCanvasRenderingContext2D
            | null = null;

        if (this.canvas instanceof HTMLCanvasElement) {
            // HTMLCanvasElement.getContext("2d") returns CanvasRenderingContext2D
            ctx2d = this.canvas.getContext("2d", { alpha: true });
        } else {
            // OffscreenCanvas.getContext("2d") returns OffscreenCanvasRenderingContext2D
            ctx2d = (this.canvas as OffscreenCanvas).getContext("2d", {
                alpha: true,
            });
        }

        if (!ctx2d) {
            throw new Error("[CPURenderingLayer]: 2D context not supported.");
        }

        // now TS knows ctx2d is exactly the 2D-drawing interface
        this.ctx = ctx2d;

        const DPR = window.devicePixelRatio || 1;
        this.canvas.width = opts.width * DPR;
        this.canvas.height = opts.height * DPR;

        if (this.canvas instanceof HTMLCanvasElement) {
            this.canvas.style.width = `${opts.width}px`;
            this.canvas.style.height = `${opts.height}px`;
        }

        this.ctx.scale(DPR, DPR);
        this.ctx.imageSmoothingEnabled = false;

        const { r, g, b, a } = opts.backgroundColor;
        this.backgroundColor = {
            r: Cmath.to255(r),
            g: Cmath.to255(g),
            b: Cmath.to255(b),
            a: Cmath.to255(a),
        };

        this.setBackgroundColor();
    }

    public get width(): number {
        return this.canvas.width;
    }

    public get height(): number {
        return this.canvas.height;
    }

    public get worldWidth(): number {
        return this.optsW;
    }

    public get worldHeight(): number {
        return this.optsH;
    }

    public getCanvas(): OffscreenCanvas | HTMLCanvasElement {
        return this.canvas;
    }

    public getContext():
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D {
        return this.ctx;
    }

    public resize(width: number, height: number): void {
        const DPR = window.devicePixelRatio || 1;

        this.canvas.width = width * DPR;
        this.canvas.height = height * DPR;

        if (this.canvas instanceof HTMLCanvasElement) {
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform

        // 🧠 Add scaling to fit fixed world space into new canvas size
        const scaleX = (width * DPR) / this.optsW;
        const scaleY = (height * DPR) / this.optsH;

        this.ctx.scale(scaleX, scaleY);
    }

    public clear(): void {
        // this.setBackgroundColor();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public destroy(): void {
        // Nothing to clean up (for now)
    }

    private setBackgroundColor(): void {
        const c = this.backgroundColor;
        this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
    }
}
