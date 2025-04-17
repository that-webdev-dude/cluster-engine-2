// import { Assets } from "../core/Assets";
// import CharactersImageURL from "../../images/characters.png";

// interface Renderable {
//   image: HTMLImageElement;
//   frameX: number;
//   frameY: number;
//   opacity: number;
// }

// interface DataModel {
//   x: Float32Array;
//   y: Float32Array;
//   ox: Float32Array;
//   oy: Float32Array;
//   sx: Float32Array;
//   sy: Float32Array;
//   px: Float32Array;
//   py: Float32Array;
//   w: Uint16Array;
//   h: Uint16Array;
//   radians: Float32Array;
//   renderable: (Renderable | null)[];
// }

// // let's create a dataModel object for testing. 10 entries.
// const dataModel: DataModel = {
//   x: new Float32Array(10),
//   y: new Float32Array(10),
//   ox: new Float32Array(10),
//   oy: new Float32Array(10),
//   sx: new Float32Array(10),
//   sy: new Float32Array(10),
//   px: new Float32Array(10),
//   py: new Float32Array(10),
//   w: new Uint16Array(10),
//   h: new Uint16Array(10),
//   radians: new Float32Array(10),
//   renderable: [],
// };

// const image = Assets.image(CharactersImageURL);

// for (let i = 0; i < 10; i++) {
//   dataModel.x[i] = Math.random() * 100;
//   dataModel.y[i] = Math.random() * 100;
//   dataModel.ox[i] = Math.random();
//   dataModel.oy[i] = Math.random();
//   dataModel.sx[i] = Math.random() * 2;
//   dataModel.sy[i] = Math.random() * 2;
//   dataModel.px[i] = 16;
//   dataModel.py[i] = 16;
//   dataModel.w[i] = 32;
//   dataModel.h[i] = 32;
//   dataModel.radians[i] = Math.random() * Math.PI * 2;

//   dataModel.renderable[i] = {
//     image: image,
//     frameX: 0,
//     frameY: 0,
//     opacity: Math.random(),
//   };
// }

// export class Renderer2D {
//   private _context: CanvasRenderingContext2D;

//   constructor(context: CanvasRenderingContext2D) {
//     this._context = context;
//   }

//   public render(dataModel: DataModel, alpha: number): void {
//     this._context.clearRect(
//       0,
//       0,
//       this._context.canvas.width,
//       this._context.canvas.height
//     );

//     dataModel.renderable.forEach((renderable, i) => {
//       if (renderable) {
//         const x = dataModel.x[i] * alpha + dataModel.ox[i];
//         const y = dataModel.y[i] * alpha + dataModel.oy[i];
//         const w = dataModel.w[i];
//         const h = dataModel.h[i];
//         const sx = dataModel.sx[i];
//         const sy = dataModel.sy[i];
//         const px = dataModel.px[i];
//         const py = dataModel.py[i];
//         const radians = dataModel.radians[i];

//         this._context.save();
//         this._context.globalAlpha = renderable.opacity;
//         this._context.translate(x, y);
//         this._context.scale(sx, sy);
//         this._context.translate(px, py);
//         this._context.rotate(radians);
//         this._context.translate(-px, -py);

//         // Draw the image
//         this._context.drawImage(
//           renderable.image,
//           renderable.frameX,
//           renderable.frameY,
//           w,
//           h,
//           0,
//           0,
//           w,
//           h
//         );

//         this._context.restore();
//       }
//     });
//   }
// }

// GL renderer
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

const VERTEX_SHADER_SOURCE = `
    attribute vec4 a_position;
    attribute vec2 a_texcoord;

    uniform mat4 u_matrix;

    varying vec2 v_texcoord;

    void main() {
        gl_Position = u_matrix * a_position;
        v_texcoord = a_texcoord;
    }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // solid white
  }
`;

// A simple helper to create an identity 4x4 matrix.
function createIdentityMatrix(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function translate(matrix: Float32Array, tx: number, ty: number): Float32Array {
  const result = matrix.slice(); // Create a copy of the matrix
  result[12] += tx; // Update the translation component
  result[13] += ty;
  return result;
}

function rotate(matrix: Float32Array, angle: number): Float32Array {
  const result = matrix.slice(); // Create a copy of the matrix
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  result[0] = cos;
  result[1] = sin;
  result[4] = -sin;
  result[5] = cos;

  return result;
}

function scale(matrix: Float32Array, sx: number, sy: number): Float32Array {
  const result = matrix.slice(); // Create a copy of the matrix
  result[0] *= sx; // Scale the matrix
  result[5] *= sy;
  return result;
}

function createOrthoMatrix(width: number, height: number): Float32Array {
  return new Float32Array([
    2 / width,
    0,
    0,
    0,
    0,
    2 / height,
    0,
    0,
    0,
    0,
    1,
    0,
    -1,
    -1,
    0,
    1,
  ]);
}

function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
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

export class Renderer {
  private _gl: WebGL2RenderingContext;
  private _vao: WebGLVertexArrayObject | null = null;
  private _vShader: WebGLShader | null = null;
  private _fShader: WebGLShader | null = null;
  private _program: WebGLProgram | null = null;
  private _textureMap = new WeakMap<HTMLImageElement, WebGLTexture>();

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
    this._gl.enable(this._gl.BLEND);
    this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);

    this._initShaders();
    this._initProgram();
    this._initBuffers();
  }

  private _createShader(type: number, source: string): WebGLShader | null {
    const shader = this._gl.createShader(type);
    if (!shader) return null;

    this._gl.shaderSource(shader, source);
    this._gl.compileShader(shader);

    if (this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
      return shader;
    } else {
      console.error(
        "Error compiling shader:",
        this._gl.getShaderInfoLog(shader)
      );
      this._gl.deleteShader(shader);
      return null;
    }
  }

  private _initShaders() {
    this._vShader = this._createShader(
      this._gl.VERTEX_SHADER,
      VERTEX_SHADER_SOURCE
    );
    this._fShader = this._createShader(
      this._gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER_SOURCE
    );

    if (!this._vShader || !this._fShader) {
      throw new Error("[Renderer2D]: Failed to create shaders");
    }

    return this;
  }

  private _initProgram() {
    if (!this._vShader || !this._fShader) {
      throw new Error("[Renderer2D]: Shaders not initialized");
    }

    this._program = this._gl.createProgram();
    if (!this._program) return null;

    this._gl.attachShader(this._program, this._vShader);
    this._gl.attachShader(this._program, this._fShader);
    this._gl.linkProgram(this._program);

    if (!this._gl.getProgramParameter(this._program, this._gl.LINK_STATUS)) {
      this._gl.deleteProgram(this._program);
      throw new Error(
        "[Renderer2D]: Error linking program: " +
          this._gl.getProgramInfoLog(this._program)
      );
    }

    return this;
  }

  // Initialize buffers and set attribute pointers (using a VAO)
  private _initBuffers() {
    const context = this._gl as WebGL2RenderingContext;

    if (!this._program) {
      throw new Error("[Renderer2D]: InitBuffer called before program init");
    }

    // Create and bind a VAO
    this._vao = context.createVertexArray();
    if (!this._vao) {
      throw new Error(
        "[Renderer2D]: Failed to create Vertex Array Object (VAO)."
      );
    }
    this._gl.bindVertexArray(this._vao);

    // Define the geometry for a sprite (a quad made of 2 triangles)
    const vertices = new Float32Array([
      // x, y, u, v
      0, 0, 0.0, 1.0, 1, 0, 1.0, 1.0, 0, 1, 0.0, 0.0, 0, 1, 0.0, 0.0, 1, 0, 1.0,
      1.0, 1, 1, 1.0, 0.0,
    ]);

    const vertexBuffer = this._gl.createBuffer();
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vertexBuffer);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, vertices, this._gl.STATIC_DRAW);

    // Get attribute locations from the linked program
    const posLoc = this._gl.getAttribLocation(this._program!, "a_position");
    const texLoc = this._gl.getAttribLocation(this._program!, "a_texcoord");

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT; // 4 floats per vertex

    // Set up position attribute
    this._gl.enableVertexAttribArray(posLoc);
    this._gl.vertexAttribPointer(posLoc, 2, this._gl.FLOAT, false, stride, 0);

    // Set up texture coordinate attribute
    this._gl.enableVertexAttribArray(texLoc);
    this._gl.vertexAttribPointer(
      texLoc,
      2,
      this._gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );

    // Unbind VAO (and buffer)
    this._gl.bindVertexArray(null);
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);

    return this;
  }

  private _getOrCreateTexture(image: HTMLImageElement): WebGLTexture {
    if (this._textureMap.has(image)) {
      return this._textureMap.get(image)!;
    }

    const gl = this._gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Failed to create texture.");
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // ✅ Flip ONCE here
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this._textureMap.set(image, texture);
    return texture;
  }

  // Render using a DataModel object instead of a precomputed u_matrix.
  // Here we iterate over each renderable sprite in DataModel, compute a transformation
  // matrix from its fields and then draw it.
  // public render(dataModel: DataModel, alpha: number): void {
  //   this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
  //   this._gl.clearColor(0.0, 0.0, 0.0, 1.0);
  //   this._gl.clear(this._gl.COLOR_BUFFER_BIT);

  //   this._gl.useProgram(this._program);
  //   this._gl.bindVertexArray(this._vao);

  //   // Loop through each renderable in the data model
  //   dataModel.renderable.forEach((renderable, i) => {
  //     if (!renderable) return;

  //     // Extract transformation parameters from the dataModel for this sprite
  //     const x = dataModel.x[i] * alpha + dataModel.ox[i];
  //     const y = dataModel.y[i] * alpha + dataModel.oy[i];
  //     const sx = dataModel.sx[i];
  //     const sy = dataModel.sy[i];
  //     const radians = dataModel.radians[i];
  //     const px = dataModel.px[i];
  //     const py = dataModel.py[i];

  //     // Compute a transformation matrix for this sprite.
  //     // (In a real-world situation, you'd use or write proper matrix math functions.
  //     // For demonstration we start with an identity matrix and assume helper functions for translate, rotate, scale.)
  //     let matrix = createIdentityMatrix();

  //     // Apply translation
  //     // (Note: These helper functions would modify the matrix or compose a new one.)
  //     matrix = translate(matrix, x, y);
  //     matrix = scale(matrix, sx, sy);
  //     matrix = translate(matrix, px, py);
  //     matrix = rotate(matrix, radians);
  //     matrix = translate(matrix, -px, -py);

  //     // Set the computed transformation matrix in the shader
  //     const uMatrixLoc = this._gl.getUniformLocation(
  //       this._program!,
  //       "u_matrix"
  //     );
  //     this._gl.uniformMatrix4fv(uMatrixLoc, false, matrix);

  //     // Bind texture for this sprite (assume it's already loaded in renderable.image)
  //     // You would typically have code to bind or update a texture. Here we assume a texture is bound for simplicity.
  //     // For each renderable sprite, bind its texture.
  //     if (renderable.image.complete) {
  //       // Create a new texture (ideally, you should pre-create and cache textures, not recreate every frame)
  //       const texture = this._gl.createTexture();
  //       this._gl.activeTexture(this._gl.TEXTURE0);
  //       this._gl.bindTexture(this._gl.TEXTURE_2D, texture);

  //       // Flip the Y-axis to match WebGL's texture coordinate space.
  //       this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, true);

  //       // Upload the image into the texture.
  //       this._gl.texImage2D(
  //         this._gl.TEXTURE_2D,
  //         0,
  //         this._gl.RGBA,
  //         this._gl.RGBA,
  //         this._gl.UNSIGNED_BYTE,
  //         renderable.image
  //       );

  //       // Set texture parameters for wrapping and filtering.
  //       this._gl.texParameteri(
  //         this._gl.TEXTURE_2D,
  //         this._gl.TEXTURE_WRAP_S,
  //         this._gl.CLAMP_TO_EDGE
  //       );
  //       this._gl.texParameteri(
  //         this._gl.TEXTURE_2D,
  //         this._gl.TEXTURE_WRAP_T,
  //         this._gl.CLAMP_TO_EDGE
  //       );
  //       this._gl.texParameteri(
  //         this._gl.TEXTURE_2D,
  //         this._gl.TEXTURE_MIN_FILTER,
  //         this._gl.LINEAR
  //       );
  //       this._gl.texParameteri(
  //         this._gl.TEXTURE_2D,
  //         this._gl.TEXTURE_MAG_FILTER,
  //         this._gl.LINEAR
  //       );

  //       // Set the sampler uniform to texture unit 0.
  //       const uTexLoc = this._gl.getUniformLocation(
  //         this._program!,
  //         "u_texture"
  //       );
  //       this._gl.uniform1i(uTexLoc, 0);
  //     }

  //     // Draw the quad: 6 vertices (two triangles)
  //     this._gl.drawArrays(this._gl.TRIANGLES, 0, 6);
  //   });

  //   // Clean up
  //   this._gl.bindVertexArray(null);
  //   this._gl.useProgram(null);
  // }
  // public render(dataModel: DataModel, alpha: number): void {
  //   const gl = this._gl;

  //   gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  //   gl.clearColor(0.0, 0.0, 0.0, 1.0);
  //   gl.clear(gl.COLOR_BUFFER_BIT);

  //   gl.useProgram(this._program);
  //   gl.bindVertexArray(this._vao);

  //   const projection = createOrthoMatrix(gl.canvas.width, gl.canvas.height);

  //   dataModel.renderable.forEach((renderable, i) => {
  //     if (!renderable || !renderable.image.complete) return;

  //     const x = dataModel.x[i] * alpha + dataModel.ox[i];
  //     const y = dataModel.y[i] * alpha + dataModel.oy[i];
  //     const radians = dataModel.radians[i];
  //     const px = dataModel.px[i];
  //     const py = dataModel.py[i];
  //     const width = 32;
  //     const height = 32;

  //     let model = createIdentityMatrix();
  //     model = translate(model, x, y);
  //     model = scale(model, width, height);
  //     model = translate(model, px, py);
  //     model = rotate(model, radians);
  //     model = translate(model, -px, -py);

  //     const matrix = multiplyMatrices(projection, model);
  //     const uMatrixLoc = gl.getUniformLocation(this._program!, "u_matrix");
  //     gl.uniformMatrix4fv(uMatrixLoc, false, matrix);

  //     const texture = this._getOrCreateTexture(renderable.image);
  //     gl.activeTexture(gl.TEXTURE0);
  //     gl.bindTexture(gl.TEXTURE_2D, texture);

  //     const uTexLoc = gl.getUniformLocation(this._program!, "u_texture");
  //     gl.uniform1i(uTexLoc, 0);

  //     // Sprite sheet region (no Y flip!)
  //     const u = (renderable.frameX * 32) / renderable.image.width;
  //     const v = (renderable.frameY * 32) / renderable.image.height;
  //     const uw = 32 / renderable.image.width;
  //     const uh = 32 / renderable.image.height;

  //     const uTexRegionLoc = gl.getUniformLocation(
  //       this._program!,
  //       "u_texRegion"
  //     );
  //     gl.uniform4f(uTexRegionLoc, u, v, uw, uh);

  //     gl.drawArrays(gl.TRIANGLES, 0, 6);
  //   });

  //   gl.bindVertexArray(null);
  //   gl.useProgram(null);
  // }
  public render(): void {
    const gl = this._gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._program);
    gl.bindVertexArray(this._vao);

    const projection = createOrthoMatrix(gl.canvas.width, gl.canvas.height);

    const x = 100;
    const y = 100;
    const width = 32;
    const height = 32;
    const px = 0;
    const py = 0;
    const radians = 0;

    let model = createIdentityMatrix();
    model = translate(model, x, y);
    model = scale(model, width, height);
    model = translate(model, px, py);
    model = rotate(model, radians);
    model = translate(model, -px, -py);

    const matrix = multiplyMatrices(projection, model);
    const uMatrixLoc = gl.getUniformLocation(this._program!, "u_matrix");
    gl.uniformMatrix4fv(uMatrixLoc, false, matrix);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }
}
