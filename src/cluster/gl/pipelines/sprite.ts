import { InstancedPipeline } from "../Pipeline";
import { Renderer } from "../Renderer";
import vsSource from "../shaders/spriteVs.glsl";
import fsSource from "../shaders/spriteFs.glsl";
import { GLTools } from "../tools";

function createUnitQuadMesh(): Float32Array {
    return new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);
}

export interface SpriteData extends Record<string, BufferSource> {
    a_translation: Float32Array;
    a_scale: Float32Array;
    a_rotation: Float32Array;
    a_pivot: Float32Array;
    a_uv: Float32Array;
    a_color: Uint8Array;
}

export class SpritePipeline extends InstancedPipeline<SpriteData> {
    private uCamPosLoc!: WebGLUniformLocation;
    private uProjLoc!: WebGLUniformLocation;
    private uTextureLoc!: WebGLUniformLocation;
    private texture!: WebGLTexture;
    private mesh: Float32Array;

    private constructor(renderer: Renderer, image: HTMLImageElement) {
        const mesh = createUnitQuadMesh();
        const vertexCount = mesh.length / 2;
        super(renderer, vsSource, fsSource, vertexCount, renderer.gl.TRIANGLES);
        this.mesh = mesh;
        this.texture = this.createTexture(renderer.gl, image);
    }

    public static create(renderer: Renderer, img: HTMLImageElement) {
        const pipe = new SpritePipeline(renderer, img);
        pipe.initialize(renderer.gl);
        return pipe;
    }

    private createTexture(gl: WebGL2RenderingContext, img: HTMLImageElement) {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
        return tex;
    }

    public initialize(gl: WebGL2RenderingContext): void {
        super.initialize(gl);
        this.uProjLoc = gl.getUniformLocation(this.program, "uProj")!;
        this.uCamPosLoc = gl.getUniformLocation(this.program, "uCamPos")!;
        this.uTextureLoc = gl.getUniformLocation(this.program, "uTexture")!;

        this.registerAttribute("a_vertex", {
            location: 0,
            size: 2,
            type: gl.FLOAT,
            divisor: 0,
        });
        this.setAttributeData("a_vertex", this.mesh, gl.STATIC_DRAW);

        this.registerAttribute("a_translation", {
            location: 1,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_scale", {
            location: 2,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_rotation", {
            location: 3,
            size: 1,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_pivot", {
            location: 4,
            size: 2,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_uv", {
            location: 5,
            size: 4,
            type: gl.FLOAT,
            divisor: 1,
        });
        this.registerAttribute("a_color", {
            location: 6,
            size: 4,
            type: gl.UNSIGNED_BYTE,
            divisor: 1,
        });

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
            "a_rotation",
            new Float32Array(maxInstances),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_pivot",
            new Float32Array(maxInstances * 2),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_uv",
            new Float32Array(maxInstances * 4),
            gl.DYNAMIC_DRAW
        );
        this.setAttributeData(
            "a_color",
            new Uint8Array(maxInstances * 4),
            gl.DYNAMIC_DRAW
        );

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

    // public bind(gl: WebGL2RenderingContext): void {
    //     super.bind(gl);

    //     const w = this.renderer.worldWidth;
    //     const h = this.renderer.worldHeight;
    //     // // prettier-ignore
    //     // const proj = new Float32Array([
    //     //     2/w,    0,      0,      0,
    //     //     0,     -2/h,    0,      0,
    //     //     0,      0,      1,      0,
    //     //    -1,      1,      0,      1,
    //     // ]);
    //     const proj = GLTools.createOrthoMatrix(w, h);
    //     gl.uniformMatrix4fv(this.uProjLoc, false, proj);

    //     gl.activeTexture(gl.TEXTURE0);
    //     gl.bindTexture(gl.TEXTURE_2D, this.texture);
    //     gl.uniform1i(this.uTextureLoc, 0);
    // }

    public bind(gl: WebGL2RenderingContext): void {
        super.bind(gl);
        gl.bindVertexArray(this.vao); // ← bind the VAO with all your attributes
        // then your existing projection & texture setup…
        const w = this.renderer.worldWidth;
        const h = this.renderer.worldHeight;
        gl.uniformMatrix4fv(
            this.uProjLoc,
            false,
            GLTools.createOrthoMatrix(w, h)
        );
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uTextureLoc, 0);
    }

    public setCamera(gl: WebGL2RenderingContext, x: number, y: number) {
        gl.useProgram(this.program);
        gl.uniform2f(this.uCamPosLoc, x, y);
    }
}
