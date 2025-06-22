import { Obj } from "../tools";

type RGBA = { r: number; g: number; b: number; a: number };

export interface RendererOptions {
    /** Canvas width in CSS pixels */
    width?: number;
    /** Canvas height in CSS pixels */
    height?: number;
    /** Container element or selector for appending the canvas */
    parent?: string | HTMLElement;
    /** Background clear color */
    backgroundColor?: RGBA;
    /** Enable antialiasing */
    antialias?: boolean;
    /** Enable alpha channel */
    alpha?: boolean;
    /** Enable depth buffer */
    depth?: boolean;
    /** Enable stencil buffer */
    stencil?: boolean;
}

/**
 * Thin wrapper around a WebGL2RenderingContext that handles
 * canvas creation, resizing, full-screen, and context events.
 */
export class Renderer {
    private static instance: Renderer | null = null;

    private canvas: HTMLCanvasElement;
    private bufW: number;
    private bufH: number;
    private cssW: number;
    private cssH: number;
    private aspectRatio: number;
    private backgroundColor: RGBA;

    /** Underlying WebGL2 context */
    public readonly gl: WebGL2RenderingContext;

    private depthTestEnabled = false;
    private stencilTestEnabled = false;
    private clearDepth: boolean;
    private clearStencil: boolean;
    private contextRestoredCallbacks: Array<() => void> = [];

    private handleResizeBound = Obj.debounce(this.handleResize.bind(this), 100);
    private handleFullscreenKeyBound = this.handleFullscreenKey.bind(this);
    private handleFullscreenChangeBound =
        this.handleFullscreenChange.bind(this);
    private handleContextLostBound = this.handleContextLost.bind(this);
    private handleContextRestoredBound = this.handleContextRestored.bind(this);

    /**
     * @private
     * @param opts Fully-resolved renderer options
     */
    private constructor(private opts: Required<RendererOptions>) {
        if (opts.width <= 0 || opts.height <= 0) {
            throw new Error(
                "[Renderer]: width and height must be positive numbers."
            );
        }

        // resolve parent
        let parent: HTMLElement;
        if (typeof opts.parent === "string") {
            const el = document.querySelector(
                opts.parent
            ) as HTMLElement | null;
            parent = el || document.body;
            if (!el)
                console.warn(
                    `[Renderer]: Parent selector "${opts.parent}" not found — defaulting to <body>.`
                );
        } else {
            parent =
                opts.parent instanceof HTMLElement
                    ? opts.parent
                    : document.body;
            if (!(opts.parent instanceof HTMLElement))
                console.warn(
                    `[Renderer]: Parent element invalid — defaulting to <body>.`
                );
        }

        // setup canvas & context
        this.canvas = document.createElement("canvas");
        const ctx = this.canvas.getContext("webgl2", {
            antialias: opts.antialias,
            alpha: opts.alpha,
            depth: opts.depth,
            stencil: opts.stencil,
        });
        if (!ctx)
            throw new Error(
                "[Renderer]: WebGL2 not supported by this browser."
            );
        this.gl = ctx;
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.STENCIL_TEST);

        this.clearDepth = opts.depth;
        this.clearStencil = opts.stencil;

        const DPR = window.devicePixelRatio || 1;
        this.aspectRatio = opts.width / opts.height;
        this.bufW = Math.floor(opts.width * DPR);
        this.bufH = Math.floor(opts.height * DPR);
        this.cssW = opts.width;
        this.cssH = opts.height;

        this.canvas.width = this.bufW;
        this.canvas.height = this.bufH;
        this.canvas.style.width = `${opts.width}px`;
        this.canvas.style.height = `${opts.height}px`;

        this.backgroundColor = opts.backgroundColor;
        this.applyClearColor();
        parent.appendChild(this.canvas);
        this.initialize();
        Renderer.instance = this;
    }

    get width(): number {
        return this.bufW;
    }
    get height(): number {
        return this.bufH;
    }
    get cssWidth(): number {
        return this.cssW;
    }
    get cssHeight(): number {
        return this.cssH;
    }
    get worldWidth(): number {
        return this.opts.width;
    }
    get worldHeight(): number {
        return this.opts.height;
    }

    /**
     * Returns the shared Renderer instance, creating it if needed.
     */
    public static getInstance(options: RendererOptions = {}): Renderer {
        if (!this.instance) {
            const defaults: Required<RendererOptions> = {
                width: 640,
                height: 384,
                parent: "#app",
                backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
                antialias: true,
                alpha: false,
                depth: true,
                stencil: true,
            };
            const opts = { ...defaults, ...options };
            this.instance = new Renderer(opts);
        }
        return this.instance;
    }

    public static worldWidth() {
        return Renderer.getInstance().worldWidth;
    }

    public static worldHeight() {
        return Renderer.getInstance().worldHeight;
    }

    /**
     * Creates an independent Renderer instance.
     */
    public static createInstance(options: RendererOptions = {}): Renderer {
        return this.getInstance(options);
    }

    /**
     * Updates the clear color used in `clear()`.
     * @param color RGBA clear color
     */
    public setClearColor(color: RGBA) {
        this.backgroundColor = color;
        this.applyClearColor();
    }

    /** Toggle depth testing on/off */
    public setDepthTest(enabled: boolean): void {
        this.depthTestEnabled = enabled;
        enabled
            ? this.gl.enable(this.gl.DEPTH_TEST)
            : this.gl.disable(this.gl.DEPTH_TEST);
    }

    /** Toggle stencil testing on/off */
    public setStencilTest(enabled: boolean): void {
        this.stencilTestEnabled = enabled;
        enabled
            ? this.gl.enable(this.gl.STENCIL_TEST)
            : this.gl.disable(this.gl.STENCIL_TEST);
    }

    /** Enable or disable clearing the depth buffer each frame */
    public setClearDepth(enabled: boolean): void {
        this.clearDepth = enabled;
    }

    /** Enable or disable clearing the stencil buffer each frame */
    public setClearStencil(enabled: boolean): void {
        this.clearStencil = enabled;
    }

    /** Returns the requested WebGL extension or null */
    public getExtension(name: string): any {
        return this.gl.getExtension(name);
    }

    /** Checks if a WebGL extension is supported */
    public hasExtension(name: string): boolean {
        return !!this.gl.getExtension(name);
    }

    /**
     * Registers a callback to be invoked after context restoration.
     */
    public onContextRestored(callback: () => void): void {
        this.contextRestoredCallbacks.push(callback);
    }

    /**
     * Unregister a previous onContextRestored callback.
     */
    public offContextRestored(callback: () => void): void {
        const i = this.contextRestoredCallbacks.indexOf(callback);
        if (i !== -1) this.contextRestoredCallbacks.splice(i, 1);
    }

    /**
     * Clears the canvas color, depth, and stencil buffers.
     */
    public clear(): void {
        let mask = this.gl.COLOR_BUFFER_BIT;
        if (this.clearDepth) mask |= this.gl.DEPTH_BUFFER_BIT;
        if (this.clearStencil) mask |= this.gl.STENCIL_BUFFER_BIT;
        this.gl.clear(mask);
    }

    /**
     * Removes event listeners and the canvas from the DOM.
     */
    public destroy(): void {
        window.removeEventListener("resize", this.handleResizeBound);
        document.removeEventListener("keydown", this.handleFullscreenKeyBound);
        document.removeEventListener(
            "fullscreenchange",
            this.handleFullscreenChangeBound
        );
        this.canvas.removeEventListener(
            "webglcontextlost",
            this.handleContextLostBound
        );
        this.canvas.removeEventListener(
            "webglcontextrestored",
            this.handleContextRestoredBound
        );
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
        Renderer.instance = null;
    }

    /** @private */
    private applyClearColor(): void {
        const c = this.backgroundColor;
        this.gl.clearColor(c.r, c.g, c.b, c.a);
    }

    /** @private */
    private initialize(): void {
        window.addEventListener("resize", this.handleResizeBound);
        document.addEventListener("keydown", this.handleFullscreenKeyBound);
        document.addEventListener(
            "fullscreenchange",
            this.handleFullscreenChangeBound
        );
        this.canvas.addEventListener(
            "webglcontextlost",
            this.handleContextLostBound
        );
        this.canvas.addEventListener(
            "webglcontextrestored",
            this.handleContextRestoredBound
        );
        this.handleResize();
    }

    /** @private */
    private handleResize(): void {
        const rect = this.canvas.parentElement?.getBoundingClientRect();
        if (!rect) return;
        let w = Math.min(rect.width, this.opts.width);
        let h = w / this.aspectRatio;
        if (h > Math.min(rect.height, this.opts.height)) {
            h = Math.min(rect.height, this.opts.height);
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
        this.clear();
        this.gl.viewport(0, 0, this.bufW, this.bufH);
    }

    /** @private */
    private handleFullscreenKey(e: KeyboardEvent): void {
        if (e.code === "KeyF") {
            if (!document.fullscreenElement) {
                this.canvas
                    .requestFullscreen()
                    .catch((err) =>
                        console.error(
                            `[Renderer]: Fullscreen failed: ${err.message}`
                        )
                    );
            } else {
                document.exitFullscreen();
            }
        }
    }

    /** @private */
    private handleFullscreenChange(): void {
        this.handleResize();
    }

    /** @private */
    private handleContextLost(e: Event): void {
        e.preventDefault();
        console.warn("[Renderer]: WebGL context lost.");
    }

    /** @private */
    private handleContextRestored(): void {
        console.info(
            "[Renderer]: Context restored — reinitializing resources."
        );
        this.contextRestoredCallbacks.forEach((cb) => cb());
    }
}
