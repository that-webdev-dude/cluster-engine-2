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

export default () => {
  const renderer = new Renderer(canvas);
  const gl = renderer.gl;

  // one‐time setup
  const shader = new SimpleShader(gl, vsSource, fsSource);
  const mesh = new SimpleMesh(gl, shader, verticesOfSquare, 3);

  // bind once up front
  shader.activate();
  mesh.bind();

  // frame‐loop
  function frame() {
    renderer.render();
    requestAnimationFrame(frame);
  }

  frame();

  // Clean up on page unload (or call these manually whenever you need to dispose)
  window.addEventListener("unload", () => {
    mesh.dispose();
    shader.dispose();
  });
};
