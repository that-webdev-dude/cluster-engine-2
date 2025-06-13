import { Pipeline } from "../Pipeline";
import { Renderer } from "../Renderer";
import { RectData } from "./camRectData";
import vsSource from "./CamRectVs.glsl";
import fsSource from "./CamRectFs.glsl";

/**
 * Pipeline for rendering filled rectangles using instanced quads.
 */
export class RectPipeline extends Pipeline<RectData> {
    private program!: WebGLProgram;
    private vao!: WebGLVertexArrayObject;
    private quadBuffer!: WebGLBuffer;
    private posBuffer!: WebGLBuffer;
    private sizeBuffer!: WebGLBuffer;
    private colorBuffer!: WebGLBuffer;

    private uProjLoc!: WebGLUniformLocation;
    private uCamPosLoc!: WebGLUniformLocation;

    /**
     * @param renderer       Shared Renderer instance
     * @param componentTypes ECS component keys this pipeline consumes
     */
    constructor(renderer: Renderer, componentTypes: string[]) {
        super(renderer, componentTypes);
    }

    /** Compile shaders, create VAO & buffers. Recalled on context restore. */
    public initialize(gl: WebGL2RenderingContext): void {
        // Clears all existing resources if they exist
        this.clear();

        // Create & Link program from shaders
        this.program = this.createProgram(gl, vsSource, fsSource);

        // Get uniform location
        this.uProjLoc = gl.getUniformLocation(this.program, "uProj")!;
        this.uCamPosLoc = gl.getUniformLocation(this.program, "uCamPos")!;

        // Set up VAO and buffers
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        // Quad geometry buffer (unit quad)
        this.quadBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            // prettier-ignore
            new Float32Array([
                0, 0, 
                1, 0, 
                0, 1, 
                0, 1, 
                1, 0, 
                1, 1
            ]),
            gl.STATIC_DRAW
        );
        // aQuadPos @ location=0
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // Instance position buffer @ location=1
        this.posBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(1, 1);

        // Instance size buffer @ location=2
        this.sizeBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(2, 1);

        // Instance color buffer @ location=3
        this.colorBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.vertexAttribDivisor(3, 1);

        // Cleanup bindings
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /** Bind program, VAO, and set the orthographic projection. */
    public bind(gl: WebGL2RenderingContext): void {
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        // Ortho from [0,width]×[0,height] to NDC
        const w = this.renderer.worldWidth;
        const h = this.renderer.worldHeight;
        // prettier-ignore
        const proj = new Float32Array([
            2/w,  0,    0,    0,
            0,   -2/h,  0,    0,
            0,    0,    1,    0,
           -1,    1,    0,    1,
        ]);
        gl.uniformMatrix4fv(this.uProjLoc, false, proj);

        // ❗️ this is the place where we set the camera uniform from the rendererSystem
        this.setCameraUniform();
        gl.uniform2f(this.uCamPosLoc, 100, 100);
    }

    public setCameraUniform() {
        // ❗️ Set camera uniform here!
    }

    /**
     * Upload instance data and render all rectangles in one instanced draw.
     * @param data  SoA buffers of positions, sizes, colors
     * @param count Number of rectangles to draw
     */
    public draw(
        gl: WebGL2RenderingContext,
        data: RectData,
        count: number
    ): void {
        gl.bindVertexArray(this.vao);
        // positions
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.DYNAMIC_DRAW);
        // sizes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.sizes, gl.DYNAMIC_DRAW);
        // colors
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.colors, gl.DYNAMIC_DRAW);
        // draw instanced
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
        gl.bindVertexArray(null);
    }

    /** Clears all the GPU resources hanging around */
    public clear(): void {
        const gl = this.gl;
        gl.deleteProgram(this.program);
        gl.deleteBuffer(this.quadBuffer);
        gl.deleteBuffer(this.posBuffer);
        gl.deleteBuffer(this.sizeBuffer);
        gl.deleteBuffer(this.colorBuffer);
        gl.deleteVertexArray(this.vao);
    }

    /** Delete GPU resources */
    public destroy(): void {
        // Unregister our restore listener so initialize() won't be called again
        super.destroy();

        // Delete all GPU resources
        this.clear();
    }
}
