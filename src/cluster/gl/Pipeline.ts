import { Renderer } from "./Renderer";

/**
 * A GPU-managed resource that can be initialized (or re-initialized)
 * when the WebGL context is first created or after it is restored.
 */
export interface GLResource {
    /** Compile shaders, allocate buffers/textures, etc. */
    initialize(gl: WebGL2RenderingContext): void;
}

/**
 * Explicit contract between Pipeline and GLResource.
 */
export interface PipelineResource extends GLResource {
    /** Bind global pipeline state (shaders, blend modes, uniforms, etc.) */
    bind(gl: WebGL2RenderingContext): void;

    /** Upload per-instance SoA buffers and issue the draw call. */
    draw(gl: WebGL2RenderingContext, data: any, count: number): void;

    /** Unregister context restore callback and free GPU resources. */
    destroy(): void;
}

/**
 * Abstract base class for GPU pipelines in an ECS-driven renderer.
 *
 * DataSoA: the structure-of-arrays type describing per-instance attributes.
 */
export abstract class Pipeline<DataSoA> {
    /** WebGL2 context from the renderer */
    protected readonly gl: WebGL2RenderingContext;

    /** List of component names this pipeline consumes (for ECS queries) */
    public readonly componentTypes: string[];

    /** Internal callback for context restoration */
    private readonly contextRestoreCallback: () => void;

    /**
     * @param renderer      Shared renderer instance
     * @param componentTypes Array of ECS component keys this pipeline will render
     */
    constructor(
        protected readonly renderer: Renderer,
        componentTypes: string[]
    ) {
        this.gl = renderer.gl;
        this.componentTypes = componentTypes;

        // Reinitialize resources after context restore
        this.contextRestoreCallback = () => this.initialize(this.gl);
        this.renderer.onContextRestored(this.contextRestoreCallback);

        // Initial setup
        this.initialize(this.gl);
    }

    /**
     * Compile shaders, allocate VAOs/buffers, and set up initial GPU state.
     * Called once at startup and again after a lost & restored context.
     */
    public abstract initialize(gl: WebGL2RenderingContext): void;

    /**
     * Bind global pipeline state (shaders, blend modes, uniforms, etc.)
     * Called once per frame before drawing.
     */
    public abstract bind(gl: WebGL2RenderingContext): void;

    /**
     * Upload per-instance SoA buffers and issue the draw call.
     * @param data   SoA data buffers (typed arrays)
     * @param count  Number of instances to draw
     */
    public abstract draw(
        gl: WebGL2RenderingContext,
        data: DataSoA,
        count: number
    ): void;

    /**
     * Optional cleanup: delete shaders, buffers, and unregister context callbacks.
     */
    public destroy(): void {
        // Unregister our restore listener so initialize() won't be called again
        this.renderer.offContextRestored(this.contextRestoreCallback);
        // Subclasses should override and call super.destroy() first,
        // then delete their own GL resources.
    }

    /**
     * Utility method to compile a shader from source code.
     */
    private compileShader(
        gl: WebGL2RenderingContext,
        type: number,
        source: string
    ): WebGLShader {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${log}`);
        }
    }

    /**
     * Utility method to link vertex and fragment shaders into a program.
     */
    protected createProgram(
        gl: WebGL2RenderingContext,
        vsSource: string,
        fsSource: string
    ): WebGLProgram {
        const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return program;
        } else {
            const log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program link error: ${log}`);
        }
    }
}
