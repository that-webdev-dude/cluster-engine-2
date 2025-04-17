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
// export class SimpleImageRenderer {
//   private gl: WebGL2RenderingContext;
//   private program: WebGLProgram;

//   constructor(
//     private canvas: HTMLCanvasElement,
//     private image: HTMLImageElement
//   ) {
//     const gl = canvas.getContext("webgl2");
//     if (!gl) throw new Error("WebGL2 not supported");
//     this.gl = gl;
//     this.program = this.createProgram();
//     this.init();
//   }

//   private createShader(type: GLenum, source: string): WebGLShader {
//     const shader = this.gl.createShader(type)!;
//     this.gl.shaderSource(shader, source);
//     this.gl.compileShader(shader);
//     if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
//       throw new Error(this.gl.getShaderInfoLog(shader)!);
//     }
//     return shader;
//   }

//   private createProgram(): WebGLProgram {
//     const vsSource = `
//       attribute vec2 a_position;
//       attribute vec2 a_texcoord;
//       varying vec2 v_texcoord;
//       void main() {
//         gl_Position = vec4(a_position, 0, 1);
//         v_texcoord = a_texcoord;
//       }
//     `;

//     const fsSource = `
//       precision mediump float;
//       varying vec2 v_texcoord;
//       uniform sampler2D u_texture;
//       void main() {
//         gl_FragColor = texture2D(u_texture, v_texcoord);
//       }
//     `;

//     const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
//     const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

//     const program = this.gl.createProgram()!;
//     this.gl.attachShader(program, vs);
//     this.gl.attachShader(program, fs);
//     this.gl.linkProgram(program);

//     if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
//       throw new Error(this.gl.getProgramInfoLog(program)!);
//     }

//     return program;
//   }

//   private init(): void {
//     const gl = this.gl;
//     gl.useProgram(this.program);

//     // Setup geometry and texture coords
//     const vertices = new Float32Array([
//       -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1,
//       1,
//     ]);

//     const buffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//     gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

//     const aPosition = gl.getAttribLocation(this.program, "a_position");
//     const aTexcoord = gl.getAttribLocation(this.program, "a_texcoord");

//     gl.enableVertexAttribArray(aPosition);
//     gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

//     gl.enableVertexAttribArray(aTexcoord);
//     gl.vertexAttribPointer(aTexcoord, 2, gl.FLOAT, false, 16, 8);

//     const texture = gl.createTexture();
//     gl.bindTexture(gl.TEXTURE_2D, texture);
//     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//     gl.texImage2D(
//       gl.TEXTURE_2D,
//       0,
//       gl.RGBA,
//       gl.RGBA,
//       gl.UNSIGNED_BYTE,
//       this.image
//     );
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//   }

//   public render(): void {
//     const gl = this.gl;
//     gl.viewport(0, 0, this.canvas.width, this.canvas.height);
//     gl.clearColor(0.0, 0.0, 0.0, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT);

//     gl.useProgram(this.program);
//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//   }
// }

// export class SimpleImageRenderer {
//   private gl: WebGL2RenderingContext;
//   private program: WebGLProgram;
//   private vao: WebGLVertexArrayObject;

//   constructor(
//     private canvas: HTMLCanvasElement,
//     private image: HTMLImageElement
//   ) {
//     const gl = canvas.getContext("webgl2");
//     if (!gl) throw new Error("WebGL2 not supported");
//     this.gl = gl;
//     this.program = this.createProgram();
//     this.vao = this.init();
//   }

//   private createShader(type: GLenum, source: string): WebGLShader {
//     const shader = this.gl.createShader(type)!;
//     this.gl.shaderSource(shader, source);
//     this.gl.compileShader(shader);
//     if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
//       throw new Error(this.gl.getShaderInfoLog(shader)!);
//     }
//     return shader;
//   }

//   private createProgram(): WebGLProgram {
//     // Vertex shader: positions in pixel space, apply projection matrix
//     const vsSource = `
//       attribute vec2 a_position;
//       attribute vec2 a_texcoord;
//       uniform mat4 u_matrix;
//       varying vec2 v_texcoord;
//       void main() {
//         gl_Position = u_matrix * vec4(a_position, 0, 1);
//         v_texcoord = a_texcoord;
//       }
//     `;

//     const fsSource = `
//       precision mediump float;
//       varying vec2 v_texcoord;
//       uniform sampler2D u_texture;
//       void main() {
//         gl_FragColor = texture2D(u_texture, v_texcoord);
//       }
//     `;

//     const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
//     const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

//     const program = this.gl.createProgram()!;
//     this.gl.attachShader(program, vs);
//     this.gl.attachShader(program, fs);
//     this.gl.linkProgram(program);
//     if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
//       throw new Error(this.gl.getProgramInfoLog(program)!);
//     }
//     return program;
//   }

//   private init(): WebGLVertexArrayObject {
//     const gl = this.gl;
//     gl.useProgram(this.program);

//     // Compute sprite size
//     const w = this.image.width;
//     const h = this.image.height;

//     // Define two triangles covering the image in pixel coords
//     const vertices = new Float32Array([
//       // prettier-ignore
//       0,
//       0,
//       0,
//       1,
//       w,
//       0,
//       1,
//       1,
//       0,
//       h,
//       0,
//       0,
//       0,
//       h,
//       0,
//       0,
//       w,
//       0,
//       1,
//       1,
//       w,
//       h,
//       1,
//       0,
//     ]);

//     // Create VAO
//     const vao = gl.createVertexArray()!;
//     gl.bindVertexArray(vao);

//     // Create and bind buffer
//     const buffer = gl.createBuffer()!;
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//     gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

//     const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
//     const posLoc = gl.getAttribLocation(this.program, "a_position");
//     const texLoc = gl.getAttribLocation(this.program, "a_texcoord");

//     gl.enableVertexAttribArray(posLoc);
//     gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);

//     gl.enableVertexAttribArray(texLoc);
//     gl.vertexAttribPointer(
//       texLoc,
//       2,
//       gl.FLOAT,
//       false,
//       stride,
//       2 * Float32Array.BYTES_PER_ELEMENT
//     );

//     // Load texture
//     const texture = gl.createTexture()!;
//     gl.bindTexture(gl.TEXTURE_2D, texture);
//     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//     gl.texImage2D(
//       gl.TEXTURE_2D,
//       0,
//       gl.RGBA,
//       gl.RGBA,
//       gl.UNSIGNED_BYTE,
//       this.image
//     );
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

//     gl.bindVertexArray(null);
//     gl.bindBuffer(gl.ARRAY_BUFFER, null);
//     return vao;
//   }

//   // Creates an orthographic projection matrix mapping pixel coords to clip space
//   private createOrthoMatrix(width: number, height: number): Float32Array {
//     return new Float32Array([
//       2 / width,
//       0,
//       0,
//       0,
//       0,
//       -2 / height,
//       0,
//       0,
//       0,
//       0,
//       1,
//       0,
//       -1,
//       1,
//       0,
//       1,
//     ]);
//   }

//   public render(): void {
//     const gl = this.gl;
//     gl.viewport(0, 0, this.canvas.width, this.canvas.height);
//     gl.clearColor(0, 0, 0, 0);
//     gl.clear(gl.COLOR_BUFFER_BIT);
//     gl.enable(gl.BLEND);
//     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
//     gl.clear(gl.COLOR_BUFFER_BIT);

//     gl.useProgram(this.program);
//     gl.bindVertexArray(this.vao);

//     // Set the projection matrix uniform
//     const matrix = this.createOrthoMatrix(
//       this.canvas.width,
//       this.canvas.height
//     );
//     const uMatrixLoc = gl.getUniformLocation(this.program, "u_matrix");
//     gl.uniformMatrix4fv(uMatrixLoc, false, matrix);

//     // Draw the triangles
//     gl.drawArrays(gl.TRIANGLES, 0, 6);

//     gl.bindVertexArray(null);
//   }
// }

// export class SimpleImageRenderer {
//   private gl: WebGL2RenderingContext;
//   private program: WebGLProgram;
//   private vao: WebGLVertexArrayObject;

//   // Transform properties
//   public x = 0;
//   public y = 0;
//   public rotation = 0; // in radians
//   public scaleX = 1;
//   public scaleY = 1;

//   constructor(
//     private canvas: HTMLCanvasElement,
//     private image: HTMLImageElement
//   ) {
//     const gl = canvas.getContext("webgl2");
//     if (!gl) throw new Error("WebGL2 not supported");
//     this.gl = gl;
//     this.program = this.createProgram();
//     this.vao = this.init();
//   }

//   /** Compile a shader of the given type */
//   private createShader(type: GLenum, source: string): WebGLShader {
//     const shader = this.gl.createShader(type)!;
//     this.gl.shaderSource(shader, source);
//     this.gl.compileShader(shader);
//     if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
//       throw new Error(this.gl.getShaderInfoLog(shader)!);
//     }
//     return shader;
//   }

//   /** Link vertex and fragment shaders into a program */
//   private createProgram(): WebGLProgram {
//     const vsSource = `
//       attribute vec2 a_position;
//       attribute vec2 a_texcoord;
//       uniform mat4 u_matrix;
//       varying vec2 v_texcoord;
//       void main() {
//         gl_Position = u_matrix * vec4(a_position, 0, 1);
//         v_texcoord = a_texcoord;
//       }
//     `;
//     const fsSource = `
//       precision mediump float;
//       varying vec2 v_texcoord;
//       uniform sampler2D u_texture;
//       void main() {
//         gl_FragColor = texture2D(u_texture, v_texcoord);
//       }
//     `;

//     const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
//     const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

//     const program = this.gl.createProgram()!;
//     this.gl.attachShader(program, vs);
//     this.gl.attachShader(program, fs);
//     this.gl.linkProgram(program);
//     if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
//       throw new Error(this.gl.getProgramInfoLog(program)!);
//     }
//     return program;
//   }

//   /** Set up VAO, buffers, and texture */
//   private init(): WebGLVertexArrayObject {
//     const gl = this.gl;
//     gl.useProgram(this.program);

//     // Compute sprite size
//     const w = this.image.width;
//     const h = this.image.height;

//     // Vertex data: two triangles covering the image in pixel coords
//     const vertices = new Float32Array([
//       // x,   y,    u,  v
//       0,
//       0,
//       0,
//       1,
//       w,
//       0,
//       1,
//       1,
//       0,
//       h,
//       0,
//       0,
//       0,
//       h,
//       0,
//       0,
//       w,
//       0,
//       1,
//       1,
//       w,
//       h,
//       1,
//       0,
//     ]);

//     const vao = gl.createVertexArray()!;
//     gl.bindVertexArray(vao);

//     const buffer = gl.createBuffer()!;
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//     gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

//     const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
//     const posLoc = gl.getAttribLocation(this.program, "a_position");
//     const texLoc = gl.getAttribLocation(this.program, "a_texcoord");

//     gl.enableVertexAttribArray(posLoc);
//     gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);

//     gl.enableVertexAttribArray(texLoc);
//     gl.vertexAttribPointer(
//       texLoc,
//       2,
//       gl.FLOAT,
//       false,
//       stride,
//       2 * Float32Array.BYTES_PER_ELEMENT
//     );

//     // Create and bind texture
//     const texture = gl.createTexture()!;
//     gl.bindTexture(gl.TEXTURE_2D, texture);
//     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//     gl.texImage2D(
//       gl.TEXTURE_2D,
//       0,
//       gl.RGBA,
//       gl.RGBA,
//       gl.UNSIGNED_BYTE,
//       this.image
//     );
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

//     gl.bindVertexArray(null);
//     gl.bindBuffer(gl.ARRAY_BUFFER, null);

//     return vao;
//   }

//   /** Create orthographic projection matrix */
//   private createOrthoMatrix(width: number, height: number): Float32Array {
//     return new Float32Array([
//       2 / width,
//       0,
//       0,
//       0,
//       0,
//       -2 / height,
//       0,
//       0,
//       0,
//       0,
//       1,
//       0,
//       -1,
//       1,
//       0,
//       1,
//     ]);
//   }

//   /** Utility: multiply two 4x4 matrices */
//   private multiply(a: Float32Array, b: Float32Array): Float32Array {
//     const out = new Float32Array(16);
//     for (let i = 0; i < 4; ++i) {
//       const ai0 = a[i],
//         ai1 = a[i + 4],
//         ai2 = a[i + 8],
//         ai3 = a[i + 12];
//       out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
//       out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
//       out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
//       out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
//     }
//     return out;
//   }

//   /** Utility: create identity matrix */
//   private identity(): Float32Array {
//     return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
//   }

//   /** Utility: translate matrix */
//   private translate(m: Float32Array, x: number, y: number): Float32Array {
//     const o = m.slice();
//     o[12] += x;
//     o[13] += y;
//     return o;
//   }

//   /** Utility: rotate matrix around Z */
//   private rotate(m: Float32Array, rad: number): Float32Array {
//     const o = m.slice();
//     const c = Math.cos(rad),
//       s = Math.sin(rad);
//     o[0] = c * m[0] + s * m[4];
//     o[1] = c * m[1] + s * m[5];
//     o[4] = -s * m[0] + c * m[4];
//     o[5] = -s * m[1] + c * m[5];
//     return o;
//   }

//   /** Utility: scale matrix */
//   private scaleMat(m: Float32Array, sx: number, sy: number): Float32Array {
//     const o = m.slice();
//     o[0] *= sx;
//     o[5] *= sy;
//     return o;
//   }

//   /** Render the image with transforms */
//   public render(): void {
//     const gl = this.gl;
//     gl.viewport(0, 0, this.canvas.width, this.canvas.height);
//     gl.clearColor(0, 0, 0, 1);
//     gl.clear(gl.COLOR_BUFFER_BIT);

//     gl.useProgram(this.program);
//     gl.bindVertexArray(this.vao);

//     // Build projection and model matrices
//     const proj = this.createOrthoMatrix(this.canvas.width, this.canvas.height);
//     let model = this.identity();
//     model = this.translate(model, this.x, this.y);
//     model = this.rotate(model, this.rotation);
//     model = this.scaleMat(model, this.scaleX, this.scaleY);

//     // Multiply: projection * model
//     const matrix = this.multiply(proj, model);

//     // Set uniform
//     const uMatrixLoc = gl.getUniformLocation(this.program, "u_matrix");
//     gl.uniformMatrix4fv(uMatrixLoc, false, matrix);

//     // Draw
//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//     gl.bindVertexArray(null);
//   }
// }

export class SimpleImageRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;

  // Transform properties
  public x = 0;
  public y = 0;
  public rotation = 0; // in radians
  public scaleX = 1;
  public scaleY = 1;

  // Cropping/frame properties (in pixels)
  public frameX = 0;
  public frameY = 0;
  public frameWidth: number;
  public frameHeight: number;

  constructor(
    private canvas: HTMLCanvasElement,
    private image: HTMLImageElement,
    frameWidth?: number,
    frameHeight?: number
  ) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.program = this.createProgram();
    // Default frame = full image if not specified
    this.frameWidth = frameWidth ?? image.width;
    this.frameHeight = frameHeight ?? image.height;
    this.vao = this.init();
  }

  /** Compile a shader of the given type */
  private createShader(type: GLenum, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  /** Link vertex and fragment shaders into a program */
  private createProgram(): WebGLProgram {
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      uniform mat4 u_matrix;
      uniform vec4 u_texRegion; // x, y, width, height in UV space
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

  /** Set up VAO, buffers, and texture */
  private init(): WebGLVertexArrayObject {
    const gl = this.gl;
    gl.useProgram(this.program);

    // Full image dimensions
    const imgW = this.image.width;
    const imgH = this.image.height;

    // Vertex data: a unit quad in pixel coords, will be scaled in render()
    const vertices = new Float32Array([
      // x,   y,    u,  v
      0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0,
    ]);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

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

    // Create and bind texture
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
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

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return vao;
  }

  /** Create orthographic projection matrix */
  private createOrthoMatrix(width: number, height: number): Float32Array {
    return new Float32Array([
      2 / width,
      0,
      0,
      0,
      0,
      -2 / height,
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

  /** Utility: multiply two 4x4 matrices */
  private multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; ++i) {
      const ai0 = a[i],
        ai1 = a[i + 4],
        ai2 = a[i + 8],
        ai3 = a[i + 12];
      out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
      out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
      out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
      out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }
    return out;
  }

  /** Utility: create identity matrix */
  private identity(): Float32Array {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  /** Utility: translate matrix */
  private translate(m: Float32Array, x: number, y: number): Float32Array {
    const o = m.slice();
    o[12] += x;
    o[13] += y;
    return o;
  }

  /** Utility: rotate matrix around Z */
  private rotate(m: Float32Array, rad: number): Float32Array {
    const o = m.slice();
    const c = Math.cos(rad),
      s = Math.sin(rad);
    o[0] = c * m[0] + s * m[4];
    o[1] = c * m[1] + s * m[5];
    o[4] = -s * m[0] + c * m[4];
    o[5] = -s * m[1] + c * m[5];
    return o;
  }

  /** Utility: scale matrix */
  private scaleMat(m: Float32Array, sx: number, sy: number): Float32Array {
    const o = m.slice();
    o[0] *= sx;
    o[5] *= sy;
    return o;
  }

  /** Render the sprite with cropping and transforms */
  public render(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Projection
    const proj = this.createOrthoMatrix(this.canvas.width, this.canvas.height);

    // Model transforms
    let model = this.identity();
    model = this.translate(model, this.x, this.y);
    model = this.rotate(model, this.rotation);
    model = this.scaleMat(
      model,
      this.scaleX * this.frameWidth,
      this.scaleY * this.frameHeight
    );

    const matrix = this.multiply(proj, model);
    const uMatrixLoc = gl.getUniformLocation(this.program, "u_matrix");
    gl.uniformMatrix4fv(uMatrixLoc, false, matrix);

    // Texture region in UV (account for flipped texture Y-axis)
    const imgW = this.image.width;
    const imgH = this.image.height;
    const u = this.frameX / imgW;
    const uw = this.frameWidth / imgW;
    // Because UNPACK_FLIP_Y_WEBGL flips the image on upload, we need to invert the v coordinate
    const v = 1 - (this.frameY + this.frameHeight) / imgH;
    const uh = this.frameHeight / imgH;
    const uTexRegionLoc = gl.getUniformLocation(this.program, "u_texRegion");
    gl.uniform4f(uTexRegionLoc, u, v, uw, uh);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }
}

// Usage example:
// const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
// const image = new Image();
// image.src = "./spritesheet.png";
// image.onload = () => {
//   const renderer = new SimpleImageRenderer(canvas, image, 32, 32);
//   renderer.frameX = 64; // x pixel offset
//   renderer.frameY = 32; // y pixel offset
//   renderer.x = 100;
//   renderer.y = 50;
//   renderer.rotation = Math.PI / 6;
//   renderer.scaleX = 1;
//   renderer.scaleY = 1;
//   renderer.render();
// };

Assets.onReady(() => {
  const renderer = new SimpleImageRenderer(
    display.view,
    charactersImage,
    32,
    32
  );
  renderer.frameX = 0; // x pixel offset
  renderer.frameY = 0; // y pixel offset
  renderer.x = 100;
  renderer.y = 50;
  renderer.rotation = 0;
  renderer.scaleX = 1;
  renderer.scaleY = 1;
  renderer.render();
});

export default () => {};
