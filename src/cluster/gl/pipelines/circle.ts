import { GPURenderingLayer as Renderer } from "../../core/Display";
import { InstancedPipeline } from "../Pipeline";
import { GLTools } from "../tools";
import vsSource from "../shaders/circleVs.glsl";
import fsSource from "../shaders/circleFs.glsl";
import { Buffer } from "../../types";

// private utility to define the circle mesh vertices
function createUnitCircleMesh(segments = 36): Float32Array {
    const verts: number[] = [0, 0];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        verts.push(Math.cos(theta), Math.sin(theta));
    }
    return new Float32Array(verts);
}

/**
 * Represents the data structure required for rendering circles in a WebGL pipeline.
 *
 * @remarks
 * This interface extends a generic record mapping string keys to `BufferSource` values,
 * and defines specific attributes for circle rendering.
 *
 * @property a_translation - [x0, y0, x1, y1, …]
 * @property a_scale - [r0, r1, …]
 * @property a_color - [r,g,b,a,  r,g,b,a, …]
 */
export interface CircleData extends Record<string, Buffer> {
    a_translation: Float32Array; // [x0, y0, x1, y1, …]
    a_scale: Float32Array; // [r0, r1, …]
    a_color: Uint8Array; // [r,g,b,a,  r,g,b,a, …]
}

export class CirclePipeline extends InstancedPipeline<CircleData> {
    private uCamPosLoc!: WebGLUniformLocation;
    private uProjLoc!: WebGLUniformLocation;
    private readonly mesh: Float32Array;

    constructor(renderer: Renderer) {
        const mesh = createUnitCircleMesh();
        const vertexCount = mesh.length / 2;

        super(
            renderer,
            vsSource,
            fsSource,
            vertexCount,
            renderer.gl.TRIANGLE_FAN,
            ["Position", "Radius", "Color"]
        );

        this.mesh = mesh;
    }

    // public override destroy(): void {
    // ... override if using other resources
    // }

    public static create(renderer: Renderer) {
        const pipe = new CirclePipeline(renderer);
        pipe.initialize(renderer.gl);
        return pipe;
    }

    public initialize(gl: WebGL2RenderingContext): void {
        super.initialize(gl);

        // get uniform locations
        this.uProjLoc = gl.getUniformLocation(this.program, "uProj")!;
        this.uCamPosLoc = gl.getUniformLocation(this.program, "uCamPos")!;

        // base mesh: a circle fan
        this.registerAttribute("a_vertex", {
            location: 0, // must match 'layout(location=0)' in circleVs.glsl
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 0, // per-vertex
        });
        this.setAttributeData("a_vertex", this.mesh, gl.STATIC_DRAW);

        // per-instance attributes
        this.registerAttribute("a_translation", {
            location: 1, // layout(location=1)
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 1, // advance once per instance
        });
        this.registerAttribute("a_scale", {
            location: 2, // layout(location=2)
            size: 1, // float (radius)
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_color", {
            location: 3, // layout(location=3)
            size: 4, // u8 vec4
            type: gl.UNSIGNED_BYTE,
            divisor: 1,
        });

        // pre-allocate instance buffers to max expected capacity (optional perf)
        const maxInstances = 1024;
        this.setAttributeData(
            "a_translation",
            new Float32Array(maxInstances * 2),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_scale",
            new Float32Array(maxInstances * 1),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_color",
            new Uint8Array(maxInstances * 4),
            gl.DYNAMIC_DRAW
        );

        // record all pointers & divisors in the VAO once
        gl.bindVertexArray(this.vao);
        for (const [name, spec] of this.attributeSpecs) {
            const buf = this.buffers[name];
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.enableVertexAttribArray(spec.location);
            gl.vertexAttribPointer(
                spec.location,
                spec.size,
                spec.type,
                false,
                0,
                0
            );
            gl.vertexAttribDivisor(spec.location, spec.divisor ?? 0);
        }
        gl.bindVertexArray(null);
    }

    public bind(gl: WebGL2RenderingContext): void {
        super.bind(gl);

        const w = this.renderer.worldWidth;
        const h = this.renderer.worldHeight;

        const proj = GLTools.createOrthoMatrix(w, h);
        gl.uniformMatrix4fv(this.uProjLoc, false, proj);
    }

    public setCamera(gl: WebGL2RenderingContext, x: number, y: number) {
        gl.useProgram(this.program);
        gl.uniform2f(this.uCamPosLoc, x, y);
    }
}
