/**
 * File: src/cluster/core/Display.ts
 *
 * Main display and rendering layer management for cluster-engine-2.
 *
 * This file provides the Display class for managing the main 2D canvas,
 * high-DPI scaling, resizing, fullscreen toggling, and compositing rendering layers.
 * It also defines GPU (WebGL2) and CPU (2D canvas) rendering layers, each with their own
 * context management, resizing, and clearing logic.
 *
 * Features:
 * - Canvas creation and attachment to a DOM parent
 * - High-DPI and aspect-ratio management
 * - Rendering layer creation (GPU/CPU), compositing, and destruction
 * - Background color control
 * - Fullscreen support and responsive resizing
 * - WebGL2 context loss/restoration handling for GPU layers
 */

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

    // Event listeners
    private onFullscreenChangeBound = this.onFullscreenChange.bind(this);
    private onFullscreenKeyBound = this.onFullscreenKey.bind(this);
    private onScreenResizeBound = Obj.debounce(this.onResize.bind(this), 100);

    /**
     * Use Display.getInstance() to create/retrieve the singleton. Constructor is private.
     */
    private constructor(opts: Required<DisplayOptions>) {
        if (opts.width <= 0 || opts.height <= 0) {
            throw new Error(
                "[Display.constructor]: width and height must be positive numbers."
            );
        }

        // Clamp and sanitize background color
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

        // Create and configure canvas
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

        ctx.scale(DPR, DPR); // for high-DPI
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;

        this.initialize();

        Display.instance = this;
    }

    /** Returns the canvas DOM element. */
    get canvasElement(): HTMLCanvasElement {
        return this.canvas;
    }

    /** Internal buffer width (actual pixel resolution). */
    get width(): number {
        return this.bufW;
    }

    /** Internal buffer height (actual pixel resolution). */
    get height(): number {
        return this.bufH;
    }

    /** CSS width (how wide the canvas looks in the DOM). */
    get cssWidth(): number {
        return this.cssW;
    }

    /** CSS height (how tall the canvas looks in the DOM). */
    get cssHeight(): number {
        return this.cssH;
    }

    /** Game's virtual coordinate system width. */
    get worldWidth(): number {
        return this.optsW;
    }

    /** Game's virtual coordinate system height. */
    get worldHeight(): number {
        return this.optsH;
    }

    /**
     * Returns the shared Display instance, creating it if needed.
     * @param options - Display options (merged with defaults on first call)
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

    /**
     * Creates a new GPU (WebGL2) rendering layer.
     * @param hidden - If true, does not add to compositing set.
     */
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

    /**
     * Creates a new CPU (2D canvas) rendering layer.
     * @param hidden - If true, does not add to compositing set.
     */
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

    /**
     * Composites a rendering layer onto the main display canvas.
     * @param layer - The rendering layer to transfer.
     */
    public transferRenderingLayer(layer: RenderingLayer) {
        const srcCanvas = layer.getCanvas();
        this.ctx.drawImage(srcCanvas, 0, 0, this.bufW, this.bufH);
    }

    /**
     * Creates a rendering layer of the specified type.
     * @param type - 'gpu' or 'cpu'
     * @param hidden - If true, does not add to compositing set.
     */
    public createRenderingLayer(
        type: "gpu" | "cpu",
        hidden: boolean = false
    ): RenderingLayer {
        if (type === "gpu") {
            return this.createGPURenderingLayer(hidden);
        }
        return this.createCPURenderingLayer(hidden);
    }

    /** Clears the main display and fills with the background color. */
    public clear(): void {
        this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
        this.setBackgroundColor();
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    }

    /** Destroys the display, removing listeners and canvas, and clears rendering layers. */
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
        this.destroyRenderingLayers();
    }

    /** Destroys all rendering layers and clears the set. */
    public destroyRenderingLayers() {
        for (const layer of this.renderingLayers) {
            if ("destroy" in layer && typeof layer.destroy === "function") {
                layer.destroy();
            }
        }
        this.renderingLayers.clear();
    }

    /** Renders all rendering layers onto the main display, then clears them. */
    public render() {
        this.clear();
        for (const layer of this.renderingLayers) {
            this.transferRenderingLayer(layer);
            layer.clear();
        }
    }

    /**
     * Resolves the parent DOM element to attach the canvas.
     * Falls back to <body> if selector is invalid or not found.
     */
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

    /**
     * Sets the background color for the display (and optionally updates the stored color).
     * @param rgba - RGBA color object to use, or defaults to current background.
     */
    public setBackgroundColor(rgba?: RGBA): void {
        const c = rgba || this.backgroundColor;
        this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
        if (rgba) {
            this.backgroundColor = rgba;
        }
    }

    /** Initializes event listeners and triggers first resize. */
    private initialize(): void {
        window.addEventListener("resize", this.onScreenResizeBound);
        document.addEventListener("keydown", this.onFullscreenKeyBound);
        document.addEventListener(
            "fullscreenchange",
            this.onFullscreenChangeBound
        );
        this.onResize();
    }

    /** Handles resizing the display canvas and updates buffer and CSS sizes. */
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

        // Don't need to resize layers if fixed resolution display
        this.clear();
    }

    /** Handles "F" key for fullscreen toggling. */
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

    /** Handles fullscreen change events to trigger resize. */
    private onFullscreenChange(): void {
        this.onResize();
    }
}

/**
 * GPU rendering layer using WebGL2.
 * Handles context loss/restoration, resizing, and buffer management.
 */
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

    // Event listeners
    private handleContextLostBound = this.handleContextLost.bind(this);
    private handleContextRestoredBound = this.handleContextRestored.bind(this);

    /**
     * Constructs a GPU rendering layer with specified options.
     * @param opts - Rendering layer options (required).
     */
    constructor(opts: Required<RenderingLayerOptions>) {
        this.optsW = opts.width;
        this.optsH = opts.height;

        // Use OffscreenCanvas if available, else fallback to HTMLCanvasElement
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

        // Clamp and sanitize background color
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

    /** Internal buffer width (actual pixel resolution). */
    get width(): number {
        return this.canvas.width;
    }

    /** Internal buffer height (actual pixel resolution). */
    get height(): number {
        return this.canvas.height;
    }

    /** Virtual game width for this layer. */
    get worldWidth() {
        return this.optsW;
    }

    /** Virtual game height for this layer. */
    get worldHeight() {
        return this.optsH;
    }

    /** Returns the canvas backing this layer. */
    public getCanvas(): OffscreenCanvas | HTMLCanvasElement {
        return this.canvas;
    }

    /** Returns the WebGL2 context. */
    public getContext() {
        return this.gl;
    }

    /** Initializes context loss/restoration event listeners. */
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

    /**
     * Resizes the layer buffers.
     * @param bufW - Buffer width in pixels.
     * @param bufH - Buffer height in pixels.
     */
    public resize(bufW: number, bufH: number) {
        if (!this.gl) return;
        this.canvas.width = bufW;
        this.canvas.height = bufH;

        this.gl.viewport(0, 0, bufW, bufH);
        this.clear();
    }

    /** Clears the framebuffer. */
    public clear(): void {
        let mask = this.gl.COLOR_BUFFER_BIT;
        if (this.clearDepth) mask |= this.gl.DEPTH_BUFFER_BIT;
        if (this.clearStencil) mask |= this.gl.STENCIL_BUFFER_BIT;
        this.gl.clear(mask);
    }

    /** Removes context listeners and cleans up resources. */
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

    /** Enables or disables depth testing. */
    public setDepthTest(enabled: boolean): void {
        this.depthTestEnabled = enabled;
        enabled
            ? this.gl.enable(this.gl.DEPTH_TEST)
            : this.gl.disable(this.gl.DEPTH_TEST);
    }

    /** Enables or disables stencil testing. */
    public setStencilTest(enabled: boolean): void {
        this.stencilTestEnabled = enabled;
        enabled
            ? this.gl.enable(this.gl.STENCIL_TEST)
            : this.gl.disable(this.gl.STENCIL_TEST);
    }

    /** Controls whether the depth buffer is cleared on clear(). */
    public setClearDepth(enabled: boolean): void {
        this.clearDepth = enabled;
    }

    /** Controls whether the stencil buffer is cleared on clear(). */
    public setClearStencil(enabled: boolean): void {
        this.clearStencil = enabled;
    }

    /** Gets a WebGL extension by name. */
    public getExtension(name: string): any {
        return this.gl.getExtension(name);
    }

    /** Checks if a WebGL extension is available. */
    public hasExtension(name: string): boolean {
        return !!this.gl.getExtension(name);
    }

    /** Registers a callback to be called when context is restored. */
    public onContextRestored(callback: () => void): void {
        this.contextRestoredCallbacks.push(callback);
    }

    /** Removes a context restored callback. */
    public offContextRestored(callback: () => void): void {
        const i = this.contextRestoredCallbacks.indexOf(callback);
        if (i !== -1) this.contextRestoredCallbacks.splice(i, 1);
    }

    /** Sets the clear color for this layer based on its background color. */
    private setBackgroundColor(): void {
        const c = this.backgroundColor;
        this.gl.clearColor(c.r / 255, c.g / 255, c.b / 255, c.a / 255);
    }

    /** Handles WebGL context loss. */
    private handleContextLost(e: Event): void {
        e.preventDefault();
        console.warn("[GLRenderer]: WebGL context lost.");
    }

    /** Handles WebGL context restoration. */
    private handleContextRestored(): void {
        console.info(
            "[GLRenderer]: Context restored — reinitializing resources."
        );
        this.contextRestoredCallbacks.forEach((cb) => cb());
    }
}

/**
 * CPU rendering layer using 2D canvas or OffscreenCanvas.
 * Handles high-DPI, resizing, and background color setup.
 */
export class CPURenderingLayer implements RenderingLayer {
    public readonly type: string = "cpu";
    public readonly ctx:
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D;

    private canvas: OffscreenCanvas | HTMLCanvasElement;
    private optsW: number;
    private optsH: number;
    private backgroundColor: RGBA;

    /**
     * Constructs a CPU rendering layer with specified options.
     * @param opts - Rendering layer options (required).
     */
    constructor(opts: Required<RenderingLayerOptions>) {
        this.optsW = opts.width;
        this.optsH = opts.height;

        // Use OffscreenCanvas if available, else fallback to HTMLCanvasElement
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

    /** Internal buffer width (actual pixel resolution). */
    public get width(): number {
        return this.canvas.width;
    }

    /** Internal buffer height (actual pixel resolution). */
    public get height(): number {
        return this.canvas.height;
    }

    /** Virtual game width for this layer. */
    public get worldWidth(): number {
        return this.optsW;
    }

    /** Virtual game height for this layer. */
    public get worldHeight(): number {
        return this.optsH;
    }

    /** Returns the canvas backing this layer. */
    public getCanvas(): OffscreenCanvas | HTMLCanvasElement {
        return this.canvas;
    }

    /** Returns the 2D context for this layer. */
    public getContext():
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * Resizes the layer buffer and CSS size, handling high-DPI scaling.
     * @param width - Target width in virtual pixels.
     * @param height - Target height in virtual pixels.
     */
    public resize(width: number, height: number): void {
        const DPR = window.devicePixelRatio || 1;

        this.canvas.width = width * DPR;
        this.canvas.height = height * DPR;

        if (this.canvas instanceof HTMLCanvasElement) {
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform

        // Scale to fit world space into new canvas size
        const scaleX = (width * DPR) / this.optsW;
        const scaleY = (height * DPR) / this.optsH;

        this.ctx.scale(scaleX, scaleY);
    }

    /** Clears the layer context. */
    public clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /** Destroys the layer (currently does nothing). */
    public destroy(): void {
        // No-op for now
    }

    /** Sets the fill style to match the background color. */
    private setBackgroundColor(): void {
        const c = this.backgroundColor;
        this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
    }
}
