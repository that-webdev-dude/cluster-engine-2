import { InstancedPipeline } from "../Pipeline";
import { Renderer } from "../Renderer";
import vsSource from "../shaders/rectVs.glsl";
import fsSource from "../shaders/rectFs.glsl";

// private utility to define the rect mesh vertices
function createUnitQuadMesh(): Float32Array {
    // prettier-ignore
    return new Float32Array([
        0, 0, 
        1, 0, 
        0, 1, 
        0, 1, 
        1, 0, 
        1, 1
    ])
}

/**
 * Represents the data structure required for rendering rectangles in a WebGL pipeline.
 *
 * @remarks
 * This interface extends a generic record mapping string keys to `BufferSource` values,
 * and defines specific attributes for rectangle rendering.
 *
 * @property a_translation - [x0, y0, x1, y1, …]
 * @property a_scale - [w0, h0, w1, h2, …]
 * @property a_color - [r,g,b,a,  r,g,b,a, …]
 */
export interface RectData extends Record<string, BufferSource> {
    a_translation: Float32Array; // [x0, y0, x1, y1, …]
    a_scale: Float32Array; // [r0, r1, …]
    a_color: Uint8Array; // [r,g,b,a,  r,g,b,a, …]
    a_rotation: Float32Array; // [r0, r1, ...]
    a_pivot: Float32Array;
}

export class RectPipeline extends InstancedPipeline<RectData> {
    private uCamPosLoc!: WebGLUniformLocation;
    private uProjLoc!: WebGLUniformLocation;
    private mesh: Float32Array;

    private constructor(renderer: Renderer) {
        const mesh = createUnitQuadMesh();
        const vertexCount = mesh.length / 2;

        super(
            renderer,
            vsSource,
            fsSource,
            vertexCount,
            renderer.gl.TRIANGLES,
            ["Position", "Size", "Color"]
        );

        this.mesh = mesh;
    }

    public static create(renderer: Renderer) {
        const pipe = new RectPipeline(renderer);
        pipe.initialize(renderer.gl);
        return pipe;
    }

    public initialize(gl: WebGL2RenderingContext): void {
        super.initialize(gl);

        // get uniform locations
        this.uProjLoc = gl.getUniformLocation(this.program, "uProj")!;
        this.uCamPosLoc = gl.getUniformLocation(this.program, "uCamPos")!;

        // base mesh: a rect fan
        this.registerAttribute("a_vertex", {
            location: 0, // must match 'layout(location=0)' in rectVs.glsl
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
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_color", {
            location: 3, // layout(location=3)
            size: 4, // u8 vec4
            type: gl.UNSIGNED_BYTE,
            divisor: 1,
        });
        this.registerAttribute("a_rotation", {
            location: 4, // layout(location=4)
            size: 1, // float rotation in radians
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_pivot", {
            location: 5, // layout(location=5)
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 1, // advance once per instance
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
            new Float32Array(maxInstances * 2),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_color",
            new Uint8Array(maxInstances * 4),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_rotation",
            new Float32Array(maxInstances * 1),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_pivot",
            new Float32Array(maxInstances * 2),
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

        // compute your ortho projection:
        const w = this.renderer.worldWidth;
        const h = this.renderer.worldHeight;
        // prettier-ignore
        const proj = new Float32Array([
            2/w,    0,      0,      0,
            0,     -2/h,    0,      0,
            0,      0,      1,      0,
           -1,      1,      0,      1,
        ]);
        gl.uniformMatrix4fv(this.uProjLoc, false, proj);
    }

    public setCamera(gl: WebGL2RenderingContext, x: number, y: number) {
        gl.useProgram(this.program);
        gl.uniform2f(this.uCamPosLoc, x, y);
    }
}
