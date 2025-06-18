import { Renderer } from "./Renderer";

/**
 * A GPU-managed resource that can be initialized (or re-initialized)
 * when the WebGL context is first created or after it is restored.
 */
// interface GLResource {
//     /** Compile shaders, allocate buffers/textures, etc. */
//     initialize(gl: WebGL2RenderingContext): void;
// }

/**
 * Explicit contract between Pipeline and GLResource.
 */
// interface PipelineResource extends GLResource {
//     /** Bind global pipeline state (shaders, blend modes, uniforms, etc.) */
//     bind(gl: WebGL2RenderingContext): void;

//     /** Upload per-instance SoA buffers and issue the draw call. */
//     draw(gl: WebGL2RenderingContext, data: any, count: number): void;

//     /** Unregister context restore callback and free GPU resources. */
//     destroy(): void;
// }

/**
 * Describes a vertex attribute specification for a WebGL pipeline.
 *
 * @property location - The attribute location in the shader program.
 * @property size - The number of components per attribute (e.g., 1, 2, 3, or 4).
 * @property type - The data type of each component (e.g., gl.FLOAT, gl.UNSIGNED_BYTE).
 * @property [divisor] - Optional. The attribute divisor for instanced rendering (default is 0).
 */
interface AttributeSpec {
    location: number;
    size: number;
    type: number;
    divisor?: number;
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

export class InstancedPipeline<
    DataSoA extends Record<string, BufferSource>
> extends Pipeline<DataSoA> {
    protected program!: WebGLProgram;

    protected attributeSpecs: Map<string, AttributeSpec> = new Map();
    protected buffers: Record<string, WebGLBuffer> = {};
    protected vao!: WebGLVertexArrayObject;

    constructor(
        renderer: Renderer,
        private vsSource: string,
        private fsSource: string,
        private vCount: number,
        private primitive: GLenum,
        componentTypes: string[]
    ) {
        super(renderer, componentTypes);
    }

    /**
     * Registers an attribute specification under the given name.
     *
     * @param name - The unique identifier for the attribute.
     * @param spec - The specification details for the attribute.
     */
    public registerAttribute(name: string, spec: AttributeSpec) {
        this.attributeSpecs.set(name, spec);
    }

    public setAttributeData(
        name: string,
        data: BufferSource,
        usage: GLenum = this.gl.DYNAMIC_DRAW
    ) {
        const gl = this.gl;
        let buf = this.buffers[name];
        if (!buf) {
            buf = gl.createBuffer()!;
            this.buffers[name] = buf;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    }

    public initialize(gl: WebGL2RenderingContext): void {
        if (this.vsSource === null || this.fsSource === null) return;

        this.program = this.createProgram(gl, this.vsSource, this.fsSource);
        this.vao = gl.createVertexArray()!;

        gl.bindVertexArray(this.vao);
        gl.bindVertexArray(null);
    }

    public bind(gl: WebGL2RenderingContext): void {
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
    }

    public draw(
        gl: WebGL2RenderingContext,
        data: DataSoA,
        count: number
    ): void {
        // Upload just the dynamic (divisor>0) buffers with bufferSubData
        for (const [name, spec] of this.attributeSpecs) {
            if ((spec.divisor ?? 0) === 0) continue; // skip mesh
            const arr = data[name as keyof DataSoA] as unknown as BufferSource;
            const buf = this.buffers[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            // update only the contents—no realloc:
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr);
        }

        // Bind program + VAO (which has your mesh & dynamic pointers already recorded)
        this.bind(gl);

        // Single instanced draw
        gl.drawArraysInstanced(this.primitive, 0, this.vCount, count);

        // Unbind
        gl.bindVertexArray(null);
    }

    // public draw(
    //     gl: WebGL2RenderingContext,
    //     data: DataSoA,
    //     count: number
    // ): void {
    //     // For each field in your SoA data, upload into its buffer:
    //     for (const key of Object.keys(data) as (keyof DataSoA)[]) {
    //         const array = data[key] as unknown as BufferSource;
    //         let buf = this.buffers[key as string];
    //         if (!buf) {
    //             buf = gl.createBuffer()!;
    //             this.buffers[key as string] = buf;
    //         }
    //         gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    //         gl.bufferData(gl.ARRAY_BUFFER, array, gl.DYNAMIC_DRAW);
    //     }

    //     // Now that buffers contain fresh data, bind program + VAO + attributes:
    //     this.bind(gl);
    //     for (const [name, spec] of this.attributeSpecs) {
    //         const loc = spec.location;
    //         const buffer = this.buffers[name];
    //         if (!buffer) continue;

    //         gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    //         gl.enableVertexAttribArray(loc);
    //         gl.vertexAttribPointer(loc, spec.size, spec.type, false, 0, 0);
    //         gl.vertexAttribDivisor(loc, spec.divisor ?? 0);
    //     }

    //     // Finally issue one instanced draw call:
    //     gl.drawArraysInstanced(gl.TRIANGLES, 0, this.vCount, count);

    //     // Cleanup (unbind VAO so we don’t pollute global state)
    //     gl.bindVertexArray(null);
    // }
}
