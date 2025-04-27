import { Display } from "./cluster/core/Display";

const display = new Display({
  parentID: "#app",
  width: 640,
  height: 480,
});
const canvas = display.view;

// simple square vertices (NDC)
const verticesOfSquare = new Float32Array([
  0.5,
  0.5,
  0.0, // top right
  0.5,
  -0.5,
  0.0, // bottom right
  -0.5,
  -0.5,
  0.0, // bottom left
  -0.5,
  0.5,
  0.0, // top left
]);

const vsSource = `#version 300 es
layout(location=0) in vec3 a_position;
out vec4 v_color;
void main() {
  gl_Position = vec4(a_position,1.0);
  v_color = vec4(1,0,0,1);
}
`;

const fsSource = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}
`;

class Renderer {
  public gl: WebGL2RenderingContext;
  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.resize(canvas.width, canvas.height);
    gl.clearColor(0, 1, 0, 1);
  }

  public resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  public clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}

class Shader {
  static compile(
    gl: WebGL2RenderingContext,
    type: GLenum,
    source: string
  ): WebGLShader {
    const src = source.trim();
    const s = gl.createShader(type);
    if (!s) throw new Error("createShader failed");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(`Shader compile error:\n${log}`);
    }
    return s;
  }
}

class Program {
  public readonly prog: WebGLProgram;
  constructor(
    private gl: WebGL2RenderingContext,
    vertSrc: string,
    fragSrc: string
  ) {
    const vs = Shader.compile(gl, gl.VERTEX_SHADER, vertSrc);
    const fs = Shader.compile(gl, gl.FRAGMENT_SHADER, fragSrc);
    const p = gl.createProgram();
    if (!p) throw new Error("createProgram failed");
    this.prog = p;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`Program link error:\n${log}`);
    }
    gl.validateProgram(p);
    if (!gl.getProgramParameter(p, gl.VALIDATE_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`Program validate error:\n${log}`);
    }

    // cleanup
    gl.detachShader(p, vs);
    gl.detachShader(p, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  }

  use() {
    this.gl.useProgram(this.prog);
  }

  getAttrib(name: string) {
    const loc = this.gl.getAttribLocation(this.prog, name);
    if (loc < 0) throw new Error(`Attrib '${name}' not found`);
    return loc;
  }

  getUniform(name: string) {
    const loc = this.gl.getUniformLocation(this.prog, name);
    if (!loc) throw new Error(`Uniform '${name}' not found`);
    return loc;
  }
}

class Buffer {
  public readonly buf: WebGLBuffer;
  constructor(gl: WebGL2RenderingContext, data: Float32Array) {
    const b = gl.createBuffer();
    if (!b) throw new Error("createBuffer failed");
    this.buf = b;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

class VertexArray {
  public readonly vao: WebGLVertexArrayObject;
  constructor(
    gl: WebGL2RenderingContext,
    buffer: Buffer,
    attribLocation: number,
    size = 3,
    type = gl.FLOAT
  ) {
    const v = gl.createVertexArray();
    if (!v) throw new Error("createVertexArray failed");
    this.vao = v;
    gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buf);
    gl.enableVertexAttribArray(attribLocation);
    gl.vertexAttribPointer(attribLocation, size, type, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

export default () => {
  const renderer = new Renderer(canvas);
  const gl = renderer.gl;

  // one‐time setup
  const program = new Program(gl, vsSource, fsSource);
  program.use();
  const buffer = new Buffer(gl, verticesOfSquare);
  const vao = new VertexArray(gl, buffer, program.getAttrib("a_position"));

  // in your game‐loop you’d do:
  renderer.clear();
  gl.bindVertexArray(vao.vao);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.bindVertexArray(null);
};
