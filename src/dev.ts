import { Display } from "./cluster/core/Display";
import { Assets } from "./cluster/core/Assets";
import CharactersImageURL from "./images/characters.png";

interface Renderable {
  image: HTMLImageElement;
  frameX: number;
  frameY: number;
  opacity: number;
}

interface DataModel {
  x: Float32Array;
  y: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  px: Float32Array;
  py: Float32Array;
  w: Uint16Array;
  h: Uint16Array;
  radians: Float32Array;
  renderable: (Renderable | null)[];
}

const charactersImage = Assets.image(CharactersImageURL);

const display = new Display({
  parentID: "#app",
  width: 800,
  height: 600,
  type: "webgl2",
});

const dataModel: DataModel = {
  x: new Float32Array(100),
  y: new Float32Array(100),
  ox: new Float32Array(100),
  oy: new Float32Array(100),
  sx: new Float32Array(100),
  sy: new Float32Array(100),
  px: new Float32Array(100),
  py: new Float32Array(100),
  w: new Uint16Array(100),
  h: new Uint16Array(100),
  radians: new Float32Array(100),
  renderable: Array.from({ length: 100 }, () => ({
    image: charactersImage,
    frameX: 0,
    frameY: 0,
    opacity: 1,
  })),
};
for (let i = 0; i < 1; i++) {
  dataModel.x[i] = 200;
  dataModel.y[i] = 200;
  dataModel.ox[i] = 0;
  dataModel.oy[i] = 0;
  dataModel.sx[i] = 1;
  dataModel.sy[i] = 1;
  dataModel.px[i] = 0;
  dataModel.py[i] = 0;
  dataModel.w[i] = 64;
  dataModel.h[i] = 64;
  dataModel.radians[i] = 0;
  dataModel.renderable[i] = {
    image: charactersImage,
    frameX: 0,
    frameY: 0,
    opacity: Math.random(),
  };
}

// File: SimpleImageRenderer.ts

/**
 * A simple WebGL2 renderer that displays batched sprites from a spritesheet
 * with transform, cropping, and batch-rendering support.
 */
export class SimpleImageRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private texture: WebGLTexture;

  /** Represents a single sprite instance in the batch */
  public sprites: Array<{
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    frameX: number;
    frameY: number;
    frameWidth: number;
    frameHeight: number;
  }> = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private image: HTMLImageElement
  ) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.program = this.createProgram();
    this.vao = this.init();
    this.texture = this.setupTexture();
  }

  /** Compile and link shaders into a program */
  private createProgram(): WebGLProgram {
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      uniform mat4 u_matrix;
      uniform vec4 u_texRegion;
      varying vec2 v_texcoord;
      void main() {
        gl_Position = u_matrix * vec4(a_position, 0, 1);
        v_texcoord = a_texcoord * u_texRegion.zw + u_texRegion.xy;
      }
    `;
    const fsSource = `
      precision mediump float;
      varying vec2 v_texcoord;
      uniform sampler2D u_texture;
      void main() {
        gl_FragColor = texture2D(u_texture, v_texcoord);
      }
    `;

    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program)!);
    }
    return program;
  }

  private createShader(type: GLenum, src: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  /** Initialize VAO and vertex buffer for a unit quad */
  private init(): WebGLVertexArrayObject {
    const gl = this.gl;
    gl.useProgram(this.program);

    // Unit quad: positions and UVs
    const verts = new Float32Array([
      0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0,
    ]);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    const posLoc = gl.getAttribLocation(this.program, "a_position");
    const texLoc = gl.getAttribLocation(this.program, "a_texcoord");

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(
      texLoc,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vao;
  }

  /** Upload image to GPU as a texture (with Y-flip) */
  private setupTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Flip Y-axis on upload to match canvas orientation
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.image
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  private createOrthoMatrix(w: number, h: number): Float32Array {
    return new Float32Array([
      2 / w,
      0,
      0,
      0,
      0,
      -2 / h,
      0,
      0,
      0,
      0,
      1,
      0,
      -1,
      1,
      0,
      1,
    ]);
  }

  private multiply(a: Float32Array, b: Float32Array): Float32Array {
    const o = new Float32Array(16);
    for (let i = 0; i < 4; ++i) {
      const a0 = a[i],
        a1 = a[i + 4],
        a2 = a[i + 8],
        a3 = a[i + 12];
      o[i] = a0 * b[0] + a1 * b[1] + a2 * b[2] + a3 * b[3];
      o[i + 4] = a0 * b[4] + a1 * b[5] + a2 * b[6] + a3 * b[7];
      o[i + 8] = a0 * b[8] + a1 * b[9] + a2 * b[10] + a3 * b[11];
      o[i + 12] = a0 * b[12] + a1 * b[13] + a2 * b[14] + a3 * b[15];
    }
    return o;
  }

  private identity(): Float32Array {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  private translate(m: Float32Array, x: number, y: number): Float32Array {
    const o = m.slice();
    o[12] += x;
    o[13] += y;
    return o;
  }

  private rotate(m: Float32Array, r: number): Float32Array {
    const o = m.slice();
    const c = Math.cos(r),
      s = Math.sin(r);
    o[0] = c * m[0] + s * m[4];
    o[1] = c * m[1] + s * m[5];
    o[4] = -s * m[0] + c * m[4];
    o[5] = -s * m[1] + c * m[5];
    return o;
  }

  private scaleMat(m: Float32Array, sx: number, sy: number): Float32Array {
    const o = m.slice();
    o[0] *= sx;
    o[5] *= sy;
    return o;
  }

  /** Batch-render all sprite instances with Y-flip UV adjustment */
  public render(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const proj = this.createOrthoMatrix(this.canvas.width, this.canvas.height);
    const uMatrixLoc = gl.getUniformLocation(this.program, "u_matrix");
    const uTexRegLoc = gl.getUniformLocation(this.program, "u_texRegion");

    // Draw each sprite in the batch
    for (const sp of this.sprites) {
      let model = this.identity();
      model = this.translate(model, sp.x, sp.y);
      model = this.rotate(model, sp.rotation);
      model = this.scaleMat(
        model,
        sp.scaleX * sp.frameWidth,
        sp.scaleY * sp.frameHeight
      );
      const m4 = this.multiply(proj, model);
      gl.uniformMatrix4fv(uMatrixLoc, false, m4);

      // compute UV region with Y-flip correction
      const u = sp.frameX / this.image.width;
      const uw = sp.frameWidth / this.image.width;
      const v = 1 - (sp.frameY + sp.frameHeight) / this.image.height;
      const uh = sp.frameHeight / this.image.height;
      gl.uniform4f(uTexRegLoc, u, v, uw, uh);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.bindVertexArray(null);
  }
}

Assets.onReady(() => {
  const renderer = new SimpleImageRenderer(display.view, charactersImage);
  renderer.sprites.push(
    {
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      frameX: 0,
      frameY: 0,
      frameWidth: 32,
      frameHeight: 32,
    },
    {
      x: 100,
      y: 150,
      rotation: Math.PI / 4,
      scaleX: 1,
      scaleY: 1,
      frameX: 32,
      frameY: 0,
      frameWidth: 32,
      frameHeight: 32,
    }
  );
  renderer.render();
});

export default () => {};
