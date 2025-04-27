import { Display } from "./cluster/core/Display";
import vsSource from "./cluster/renderer/shaders/simple01.vert";
import fsSource from "./cluster/renderer/shaders/simple01.frag";

type RGBA = [number, number, number, number];
class Renderer {
  public gl: WebGL2RenderingContext;
  constructor(
    public canvas: HTMLCanvasElement,
    public background: RGBA = [0, 0, 0, 1]
  ) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.init();
  }

  private init() {
    this.resize(this.canvas.width, this.canvas.height);
    this.clear();
  }

  public resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  public clear() {
    this.gl.clearColor(
      this.background[0],
      this.background[1],
      this.background[2],
      this.background[3]
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  public render() {
    this.clear();
    // this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6); // this is very specific to the number of vertices in the buffer
  }
}

// Utility to compile a shader
function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;

  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  throw new Error("Failed to compile shader");
}

// Utility to create a program from vertex and fragment shaders
function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
) {
  const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;

  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  throw new Error("Failed to link program");
}

export default () => {
  const display = new Display({
    parentID: "#app",
    width: 640,
    height: 480,
  });
  const renderer = new Renderer(display.view, [0.5, 0.5, 0.5, 1]);
  const gl = renderer.gl;

  // once, after getting the context (if we have transparency)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // 2. Compile & link
  const program = createProgram(gl, vsSource, fsSource);
  gl.useProgram(program);

  // 3.1 look up uniforms for color
  const uColorLoc = gl.getUniformLocation(program, "u_color");
  if (!uColorLoc) throw new Error("Failed to get uniform location");
  gl.uniform4f(uColorLoc, 1.0, 0.0, 0.0, 1.0); // Set color to red

  // 4. define position verices
  const positions = new Float32Array([
    // First triangle
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Second triangle
    0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
  ]);

  // 5. define corresponding uv coordinates
  const uvs = new Float32Array([
    // First triangle
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Second triangle
    0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
  ]);

  // 6. create buffer for positions
  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) throw new Error("Failed to create position buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  // 7. create buffer for uvs
  const uvBuffer = gl.createBuffer();
  if (!uvBuffer) throw new Error("Failed to create uv buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

  // configure attribute pointer for position
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(
    0, // index of the attribute in the shader
    2, // size of each vertex (x, y)
    gl.FLOAT, // type of each component
    false, // normalize
    0, // stride (0 = tightly packed)
    0 // offset in the buffer
  );

  // configure attribute pointer for uv
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.enableVertexAttribArray(1); // index of the attribute in the shader
  gl.vertexAttribPointer(
    1, // index of the attribute in the shader
    2, // size of each vertex (u, v)
    gl.FLOAT, // type of each component
    false, // normalize
    0, // stride (0 = tightly packed)
    0 // offset in the buffer
  );

  renderer.render();
};
