import { InstancedPipeline } from "../Pipeline";
import { Renderer } from "../Renderer";
import { GLTools } from "../tools";
import vsSource from "../shaders/spriteVs.glsl";
import fsSource from "../shaders/spriteFs.glsl";

// exactly those buffers your ECS components supply:
// Position, Offset, Size, Pivot, Angle, Color, Sprite(frame) :contentReference[oaicite:7]{index=7}
export interface SpriteData extends Record<string, BufferSource> {
    a_position: Float32Array; // [x, y] world px
    a_offset: Float32Array; // [ox, oy] px
    a_scale: Float32Array; // [width, height] px
    a_pivot: Float32Array; // [px, py] px
    a_angle: Float32Array; // radians
    a_color: Uint8Array; // [r,g,b,a] 0–255
    a_uvRect: Float32Array; // [u0, v0, u1, v1] normalized
}

export class SpritePipeline extends InstancedPipeline<SpriteData> {
    private uProjLoc!: WebGLUniformLocation;
    private uCamPosLoc!: WebGLUniformLocation;
    private uSamplerLoc!: WebGLUniformLocation;

    private constructor(renderer: Renderer, private texture: WebGLTexture) {
        // 6 verts per quad (2 triangles)
        super(renderer, vsSource, fsSource, 6, renderer.gl.TRIANGLES);
        // define a unit quad centered at origin

        const quad = new Float32Array([
            -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5,
        ]);
        this.setAttributeData("a_vertex", quad, renderer.gl.STATIC_DRAW);
    }

    /** Create one pipeline per atlas—multi-atlas grouping happens outside */
    public static create(renderer: Renderer, texture: WebGLTexture) {
        const p = new SpritePipeline(renderer, texture);
        p.initialize(renderer.gl);
        return p;
    }

    public initialize(gl: WebGL2RenderingContext) {
        super.initialize(gl);

        // grab uniforms
        this.uProjLoc = gl.getUniformLocation(this.program, "uProj")!;
        this.uCamPosLoc = gl.getUniformLocation(this.program, "uCamPos")!;
        this.uSamplerLoc = gl.getUniformLocation(this.program, "u_sampler")!;

        // register attributes exactly like mesh does
        this.registerAttribute("a_vertex", {
            location: 0,
            size: 2,
            type: gl.FLOAT,
            divisor: 0,
        });
        this.registerAttribute("a_position", {
            location: 1,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_offset", {
            location: 2,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_scale", {
            location: 3,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_pivot", {
            location: 4,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_angle", {
            location: 5,
            size: 1,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_color", {
            location: 6,
            size: 4,
            type: gl.UNSIGNED_BYTE,
            divisor: 1,
        });
        this.registerAttribute("a_uvRect", {
            location: 7,
            size: 4,
            type: gl.FLOAT,
            divisor: 1,
        });

        // pre-allocate instance buffers (use mesh’s 1024 default for now) :contentReference[oaicite:8]{index=8}
        const maxInstances = 1024;
        // prettier-ignore
        this.setAttributeData("a_position", new Float32Array(maxInstances*2))
        this.setAttributeData("a_offset", new Float32Array(maxInstances * 2));
        this.setAttributeData("a_scale", new Float32Array(maxInstances * 2));
        this.setAttributeData("a_pivot", new Float32Array(maxInstances * 2));
        this.setAttributeData("a_angle", new Float32Array(maxInstances * 1));
        this.setAttributeData("a_color", new Uint8Array(maxInstances * 4));
        this.setAttributeData("a_uvRect", new Float32Array(maxInstances * 4));

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

    public bind(gl: WebGL2RenderingContext) {
        super.bind(gl);
        // set ortho projection & camera exactly as mesh does :contentReference[oaicite:9]{index=9}
        const proj = GLTools.createOrthoMatrix(
            this.renderer.worldWidth,
            this.renderer.worldHeight
        );
        gl.uniformMatrix4fv(this.uProjLoc, false, proj);

        // bind atlas texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uSamplerLoc, 0);
    }

    public setCamera(gl: WebGL2RenderingContext, x: number, y: number) {
        gl.useProgram(this.program);
        gl.uniform2f(this.uCamPosLoc, x, y);
    }
}
