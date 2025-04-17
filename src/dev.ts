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
export class SimpleImageRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  constructor(
    private canvas: HTMLCanvasElement,
    private image: HTMLImageElement
  ) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.program = this.createProgram();
    this.init();
  }

  private createShader(type: GLenum, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  private createProgram(): WebGLProgram {
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      varying vec2 v_texcoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texcoord = a_texcoord;
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

  private init(): void {
    const gl = this.gl;
    gl.useProgram(this.program);

    // Setup geometry and texture coords
    const vertices = new Float32Array([
      -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1,
      1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(this.program, "a_position");
    const aTexcoord = gl.getAttribLocation(this.program, "a_texcoord");

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTexcoord);
    gl.vertexAttribPointer(aTexcoord, 2, gl.FLOAT, false, 16, 8);

    const texture = gl.createTexture();
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
  }

  public render(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

Assets.onReady(() => {
  const renderer = new SimpleImageRenderer(display.view, charactersImage);
  renderer.render();
});

export default () => {};
