import { InstancedPipeline } from "../Pipeline";
import { Renderer } from "../Renderer";
import { GLTools } from "../tools";
import vsSource from "../shaders/meshVs.glsl";
import fsSource from "../shaders/meshFs.glsl";

/**
 * Creates a unit-sized regular polygon mesh centered at the origin.
 * @param sides - Number of polygon sides (e.g., 4 for rectangle, 6 for hexagon).
 * @returns Vertices suitable for TRIANGLE_FAN rendering.
 */
function createUnitMeshMesh(sides: number): Float32Array {
    if (sides < 3) throw new Error("Polygon must have at least 3 sides.");

    const verts: number[] = [0, 0]; // center vertex
    const step = (Math.PI * 2) / sides;

    let rotationOffset = 0;

    if (sides === 4) {
        rotationOffset = Math.PI / 4; // Square alignment
    } else if (sides % 2 === 0) {
        rotationOffset = step / 2;
    } else {
        rotationOffset = -Math.PI / 2;
    }

    // Generate vertices
    const rawVerts: [number, number][] = [];
    for (let i = 0; i < sides; i++) {
        const theta = step * i + rotationOffset;
        rawVerts.push([Math.cos(theta), Math.sin(theta)]);
    }

    // Calculate bounding box
    const xs = rawVerts.map((v) => v[0]);
    const ys = rawVerts.map((v) => v[1]);
    const minX = Math.min(...xs),
        maxX = Math.max(...xs);
    const minY = Math.min(...ys),
        maxY = Math.max(...ys);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scaleX = maxX - minX;
    const scaleY = maxY - minY;

    const maxDimension = Math.max(scaleX, scaleY);

    // Normalize vertices to fit [-0.5, 0.5] bounding box and center correctly
    for (const [x, y] of rawVerts) {
        verts.push((x - centerX) / maxDimension, (y - centerY) / maxDimension);
    }

    // Close the polygon
    verts.push(
        (rawVerts[0][0] - centerX) / maxDimension,
        (rawVerts[0][1] - centerY) / maxDimension
    );

    return new Float32Array(verts);
}

/**
 * Represents the data structure required for rendering meshs in a WebGL pipeline.
 *
 * @remarks
 * This interface extends a generic record mapping string keys to `BufferSource` values,
 * and defines specific attributes for mesh rendering.
 */
export interface MeshData extends Record<string, BufferSource> {
    a_position: Float32Array;
    a_offset: Float32Array;
    a_scale: Float32Array;
    a_color: Uint8Array;
    a_angle: Float32Array;
    a_pivot: Float32Array;
}

export class MeshPipeline extends InstancedPipeline<MeshData> {
    private uCamPosLoc!: WebGLUniformLocation;
    private uProjLoc!: WebGLUniformLocation;
    private mesh: Float32Array;

    private constructor(renderer: Renderer, segments: number = 36) {
        const mesh = createUnitMeshMesh(segments);
        const vertexCount = mesh.length / 2;

        super(
            renderer,
            vsSource,
            fsSource,
            vertexCount,
            renderer.gl.TRIANGLE_FAN
        );

        this.mesh = mesh;
    }

    public static create(renderer: Renderer, segments: number) {
        const pipe = new MeshPipeline(renderer, segments);
        pipe.initialize(renderer.gl);
        return pipe;
    }

    // public override destroy(): void {
    // ... override if using other resources
    // }

    public initialize(gl: WebGL2RenderingContext): void {
        super.initialize(gl);

        // get uniform locations
        this.uProjLoc = gl.getUniformLocation(this.program, "uProj")!;
        this.uCamPosLoc = gl.getUniformLocation(this.program, "uCamPos")!;

        // base mesh: a mesh fan
        this.registerAttribute("a_vertex", {
            location: 0, // must match 'layout(location=0)' in meshVs.glsl
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 0, // per-vertex
        });
        this.setAttributeData("a_vertex", this.mesh, gl.STATIC_DRAW);

        // per-instance attributes
        this.registerAttribute("a_position", {
            location: 1, // layout(location=1)
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 1, // advance once per instance
        });
        this.registerAttribute("a_offset", {
            location: 2, // layout(location=2)
            size: 2, // w h
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_scale", {
            location: 3, // layout(location=2)
            size: 2, // w h
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_color", {
            location: 4, // layout(location=3)
            size: 4, // u8 vec4
            type: gl.UNSIGNED_BYTE,
            divisor: 1,
        });
        this.registerAttribute("a_pivot", {
            location: 5, // layout(location=5)
            size: 2, // vec2
            type: gl.FLOAT,
            divisor: 1, // advance once per instance
        });
        this.registerAttribute("a_angle", {
            location: 6, // layout(location=4)
            size: 1, // float rotation in radians
            type: gl.FLOAT,
            divisor: 1,
        });

        // pre-allocate instance buffers to max expected capacity (optional perf)
        const maxInstances = 1024;
        this.setAttributeData(
            "a_position",
            new Float32Array(maxInstances * 2),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_offset",
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
            "a_pivot",
            new Float32Array(maxInstances * 2),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_angle",
            new Float32Array(maxInstances * 1),
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
        // // prettier-ignore
        // const proj = new Float32Array([
        //     2/w,    0,      0,      0,
        //     0,     -2/h,    0,      0,
        //     0,      0,      1,      0,
        //    -1,      1,      0,      1,
        // ]);
        const proj = GLTools.createOrthoMatrix(w, h);
        gl.uniformMatrix4fv(this.uProjLoc, false, proj);
    }

    public setCamera(gl: WebGL2RenderingContext, x: number, y: number) {
        gl.useProgram(this.program);
        gl.uniform2f(this.uCamPosLoc, x, y);
    }
}
