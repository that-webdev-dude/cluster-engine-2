import { Obj } from "../tools";

export type RGBA = { r: number; g: number; b: number; a: number };

export interface DisplayOptions {
    width?: number;
    height?: number;
    parent?: string | HTMLElement;
    backgroundColor?: RGBA;
}

export interface RendererOptions extends DisplayOptions {
    antialias?: boolean;
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
}

export abstract class Display {
    protected canvas: HTMLCanvasElement;
    protected bufW: number;
    protected bufH: number;
    protected cssW: number;
    protected cssH: number;
    protected aspectRatio: number;
    protected backgroundColor: RGBA;
    protected opts: Required<DisplayOptions>;

    private handleResizeBound = Obj.debounce(this.handleResize.bind(this), 100);
    private handleFullscreenKeyBound = this.handleFullscreenKey.bind(this);
    private handleFullscreenChangeBound =
        this.handleFullscreenChange.bind(this);

    protected constructor(opts: Required<DisplayOptions>) {
        if (opts.width <= 0 || opts.height <= 0) {
            throw new Error(
                "[Display]: width and height must be positive numbers."
            );
        }

        this.opts = opts;
        this.aspectRatio = opts.width / opts.height;
        this.backgroundColor = opts.backgroundColor;

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

        // this.initialize();
        setTimeout(() => this.initialize(), 0);
    }

    get canvasElement(): HTMLCanvasElement {
        return this.canvas;
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

    public setClearColor(color: RGBA) {
        this.backgroundColor = color;
        this.applyClearColor(); // to be implemented by subclass
    }

    /** Override this in subclass */
    protected abstract applyClearColor(): void;

    /** Override this in subclass if needed */
    protected onResize(): void {}

    private resolveParent(
        parent: string | HTMLElement | undefined
    ): HTMLElement {
        if (typeof parent === "string") {
            const el = document.querySelector(parent) as HTMLElement | null;
            if (!el) {
                console.warn(
                    `[Display]: Parent selector "${parent}" not found — defaulting to <body>.`
                );
                return document.body;
            }
            return el;
        } else if (parent instanceof HTMLElement) {
            return parent;
        } else {
            console.warn(
                "[Display]: Parent element invalid — defaulting to <body>."
            );
            return document.body;
        }
    }

    private initialize(): void {
        window.addEventListener("resize", this.handleResizeBound);
        document.addEventListener("keydown", this.handleFullscreenKeyBound);
        document.addEventListener(
            "fullscreenchange",
            this.handleFullscreenChangeBound
        );
        this.handleResize();
    }

    protected handleResize(): void {
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

        this.onResize();
    }

    private handleFullscreenKey(e: KeyboardEvent): void {
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

    private handleFullscreenChange(): void {
        this.handleResize();
    }

    public destroy(): void {
        window.removeEventListener("resize", this.handleResizeBound);
        document.removeEventListener("keydown", this.handleFullscreenKeyBound);
        document.removeEventListener(
            "fullscreenchange",
            this.handleFullscreenChangeBound
        );
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }
}

/**
 * GLRenderer
 */
export class GLRenderer extends Display {
    // private static instances = new Map<string, GLRenderer>();

    public readonly gl: WebGL2RenderingContext;

    private depthTestEnabled = false;
    private stencilTestEnabled = false;
    private clearDepth: boolean;
    private clearStencil: boolean;
    private contextRestoredCallbacks: Array<() => void> = [];

    private handleContextLostBound = this.handleContextLost.bind(this);
    private handleContextRestoredBound = this.handleContextRestored.bind(this);

    public constructor(opts: Required<RendererOptions>) {
        super({
            width: opts.width,
            height: opts.height,
            parent: opts.parent,
            backgroundColor: opts.backgroundColor,
        });

        const ctx = this.canvas.getContext("webgl2", {
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

        this.gl = ctx;
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.STENCIL_TEST);

        this.clearDepth = opts.depth;
        this.clearStencil = opts.stencil;

        this.canvas.addEventListener(
            "webglcontextlost",
            this.handleContextLostBound
        );
        this.canvas.addEventListener(
            "webglcontextrestored",
            this.handleContextRestoredBound
        );

        this.applyClearColor();
    }

    // public static getInstance(
    //     options: RendererOptions = {},
    //     key = "default"
    // ): GLRenderer {
    //     if (!this.instances.has(key)) {
    //         const defaults: Required<RendererOptions> = {
    //             width: 640,
    //             height: 384,
    //             parent: "#app",
    //             backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
    //             antialias: true,
    //             alpha: false,
    //             depth: true,
    //             stencil: true,
    //         };
    //         const opts = { ...defaults, ...options };
    //         const instance = new GLRenderer(opts);
    //         this.instances.set(key, instance);
    //     }
    //     return this.instances.get(key)!;
    // }

    public static createInstance(options: RendererOptions): GLRenderer {
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
        return new GLRenderer(opts);
    }

    public static canvasElement() {
        return GLRenderer.canvasElement;
        // return GLRenderer.getInstance().canvasElement;
    }

    public static worldWidth() {
        return this.worldWidth;
        // return GLRenderer.getInstance().worldWidth;
    }

    public static worldHeight() {
        return this.worldHeight;
        // return GLRenderer.getInstance().worldHeight;
    }

    public static cssWidth() {
        return this.cssWidth;
        // return GLRenderer.getInstance().cssWidth;
    }

    public static cssHeight() {
        return this.cssHeight;
        // return GLRenderer.getInstance().cssHeight;
    }

    protected applyClearColor(): void {
        const c = this.backgroundColor;
        this.gl.clearColor(c.r, c.g, c.b, c.a);
    }

    public clear(): void {
        let mask = this.gl.COLOR_BUFFER_BIT;
        if (this.clearDepth) mask |= this.gl.DEPTH_BUFFER_BIT;
        if (this.clearStencil) mask |= this.gl.STENCIL_BUFFER_BIT;
        this.gl.clear(mask);
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

    public override destroy(): void {
        super.destroy();
        // for (const [key, instance] of GLRenderer.instances) {
        //     if (instance === this) {
        //         GLRenderer.instances.delete(key);
        //         break;
        //     }
        // }
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

    protected override onResize(): void {
        if (!this.gl) return;
        this.gl.viewport(0, 0, this.bufW, this.bufH);
        this.clear();
    }
}

/**
 * UIRenderer
 */
export class UIRenderer extends Display {
    private static instances = new Map<string, UIRenderer>();

    private readonly ctx: CanvasRenderingContext2D;

    private constructor(opts: Required<DisplayOptions>) {
        super(opts);

        const ctx = this.canvas.getContext("2d");
        if (!ctx) {
            throw new Error(
                "[UIRenderer]: 2D context not supported by this browser."
            );
        }

        const DPR = window.devicePixelRatio || 1;
        ctx.scale(DPR, DPR); // scale for high-DPI displays
        this.ctx = ctx;

        this.applyClearColor();
    }

    public static getInstance(
        options: DisplayOptions = {},
        key = "default"
    ): UIRenderer {
        if (!this.instances.has(key)) {
            const defaults: Required<DisplayOptions> = {
                width: 640,
                height: 384,
                parent: "#app",
                backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
            };
            const opts = { ...defaults, ...options };
            const instance = new UIRenderer(opts);
            this.instances.set(key, instance);
        }
        return this.instances.get(key)!;
    }

    public static createInstance(options: DisplayOptions): UIRenderer {
        const defaults: Required<DisplayOptions> = {
            width: 640,
            height: 384,
            parent: "#app",
            backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
        };
        const opts = { ...defaults, ...options };
        return new UIRenderer(opts);
    }

    protected applyClearColor(): void {
        const c = this.backgroundColor;
        this.ctx.fillStyle = `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${
            c.a
        })`;
    }

    public clear(): void {
        this.applyClearColor();
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    }

    protected override onResize(): void {
        const DPR = window.devicePixelRatio || 1;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        this.ctx.scale(DPR, DPR);
        this.clear();
    }

    public override destroy(): void {
        super.destroy();
        for (const [key, instance] of UIRenderer.instances) {
            if (instance === this) {
                UIRenderer.instances.delete(key);
                break;
            }
        }
    }
}
