import { Display } from "./cluster/core/Display";

const display = new Display({
  parentID: "#app",
  width: 640,
  height: 480,
});
const canvas = display.view;

// simple square vertices (NDC)
const unitQuadVerts = new Float32Array([
  // triangle strip: (–0.5,–0.5), (0.5,–0.5), (–0.5,0.5), (0.5,0.5)
  -0.5,
  -0.5,
  0.0, // bottom left
  0.5,
  -0.5,
  0.0, // bottom right
  -0.5,
  0.5,
  0.0, // top left
  0.5,
  0.5,
  0.0, // top right
]);

const vsSource = `#version 300 es
layout(location=0) in vec3 a_position;

// NEW: per-instance data
layout(location=1) in vec2 i_offset;   // x,y translation
layout(location=2) in vec2 i_scale;    // width/height
layout(location=3) in vec4 i_color;    // RGBA color

out vec4 v_color;

void main() {
  // scale then translate the unit quad:
  vec2 scaledPos = a_position.xy * i_scale;
  vec2 worldPos  = scaledPos + i_offset;

  gl_Position = vec4(worldPos, 0.0, 1.0);
  v_color = i_color;
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
  }

  public resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  public clear(r: number, g: number, b: number, a: number) {
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  public render() {
    this.clear(0, 0, 1, 1);
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
  }
}

class SimpleMesh {
  private VBO: WebGLBuffer | null = null;
  private VAO: WebGLVertexArrayObject | null = null;
  constructor(
    private gl: WebGL2RenderingContext,
    shader: SimpleShader,
    data: Float32Array,
    size: number
  ) {
    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("createBuffer failed");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.VBO = vbo;

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("createVertexArray failed");
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const loc = gl.getAttribLocation(shader.program, "a_position");
    if (loc < 0) throw new Error("Attrib 'a_position' not found");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null); // unbind VAO
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // unbind VBO
    this.VAO = vao;
  }

  public getVBO() {
    if (!this.VBO) throw new Error("VBO not set");
    return this.VBO;
  }

  public getVAO() {
    if (!this.VAO) throw new Error("VAO not set");
    return this.VAO;
  }

  public bind() {
    if (!this.VAO) throw new Error("VAO not set");
    this.gl.bindVertexArray(this.VAO);
  }

  public unbind() {
    this.gl.bindVertexArray(null);
  }

  public dispose() {
    if (this.VBO) {
      this.gl.deleteBuffer(this.VBO);
      this.VBO = null;
    }
    if (this.VAO) {
      this.gl.deleteVertexArray(this.VAO);
      this.VAO = null;
    }
  }
}

class SimpleShader {
  public readonly program: WebGLProgram;
  public readonly vShader: WebGLShader;
  public readonly fShader: WebGLShader;
  constructor(
    private gl: WebGL2RenderingContext,
    vsSource: string,
    fsSource: string
  ) {
    this.vShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    this.fShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const p = gl.createProgram();
    if (!p) throw new Error("createProgram failed");
    this.program = p;
    gl.attachShader(p, this.vShader);
    gl.attachShader(p, this.fShader);
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
    gl.detachShader(p, this.vShader);
    gl.detachShader(p, this.fShader);
    gl.deleteShader(this.vShader);
    gl.deleteShader(this.fShader);
  }

  public activate() {
    this.gl.useProgram(this.program);
    return this;
  }

  private loadShader(
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

  public dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteShader(this.vShader);
    this.gl.deleteShader(this.fShader);
  }
}

// data

export default () => {
  const renderer = new Renderer(canvas);
  const gl = renderer.gl;

  // data

  // one‐time setup
  const shader = new SimpleShader(gl, vsSource, fsSource);
  const quadMesh = new SimpleMesh(gl, shader, unitQuadVerts, 3);

  // data
  // Suppose you have this data per rectangle:
  type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
    color: [number, number, number, number];
  };
  const maxInstances = 1000; // max number of instances
  const rects: Rect[] = [];
  for (let i = 0; i < maxInstances; i++) {
    const x = Math.random() * 2 - 1; // random x in [-1,1]
    const y = Math.random() * 2 - 1; // random y in [-1,1]
    const w = Math.random() * 0.5 + 0.05; // random width in [0.05,0.55]
    const h = Math.random() * 0.5 + 0.05; // random height in [0.05,0.55]
    const color: [number, number, number, number] = [
      Math.random(),
      Math.random(),
      Math.random(),
      1,
    ];
    rects.push({ x, y, w, h, color });
  }

  // 1) Flatten into a Float32Array:
  function buildInstanceData(rects: Rect[]): Float32Array {
    const floatsPerRect = 2 /*offset*/ + 2 /*scale*/ + 4; /*color*/
    const data = new Float32Array(rects.length * floatsPerRect);
    rects.forEach((r, i) => {
      const base = i * floatsPerRect;
      data[base + 0] = r.x;
      data[base + 1] = r.y;
      data[base + 2] = r.w;
      data[base + 3] = r.h;
      data[base + 4] = r.color[0];
      data[base + 5] = r.color[1];
      data[base + 6] = r.color[2];
      data[base + 7] = r.color[3];
    });
    return data;
  }

  // 2) Create a VBO & VAO for instances:
  const instanceVBO = gl.createBuffer()!;
  gl.bindVertexArray(quadMesh.getVAO());
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);

  // allocate once (maxInstances is your upper bound):
  gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 8 * 4, gl.DYNAMIC_DRAW);

  // set up attribute pointers with divisor = 1:
  const stride = 8 * 4; // 8 floats per instance × 4 bytes
  // a) offset (vec2) at location=1
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(1, 1);
  // b) scale (vec2) at location=2
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 2 * 4);
  gl.vertexAttribDivisor(2, 1);
  // c) color (vec4) at location=3
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 4 * 4);
  gl.vertexAttribDivisor(3, 1);

  // unbind VAO/VBO
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // bind once up front
  shader.activate();
  quadMesh.bind();

  function frame() {
    // const rects: Rect[] = getYourRectanglesSomehow();
    const instData = buildInstanceData(rects);

    // upload fresh per-frame data
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData);

    // draw them all in one go
    gl.drawArraysInstanced(
      gl.TRIANGLE_STRIP,
      0, // first vertex
      4, // vertices per quad
      rects.length // instance count
    );

    requestAnimationFrame(frame);
  }

  frame();

  // Clean up on page unload (or call these manually whenever you need to dispose)
  window.addEventListener("unload", () => {
    quadMesh.dispose();
    shader.dispose();
  });
};
