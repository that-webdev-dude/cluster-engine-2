import { Display } from "./cluster/core/Display";
import { Assets } from "./cluster/core/Assets";
import SpritesheetImageURL from "./images/characters.png";
// import vsSource from "./cluster/renderer/shaders/simple01.vert";
// import fsSource from "./cluster/renderer/shaders/simple01.frag";
import vsSource from "./cluster/renderer/shaders/texture01.vert";
import fsSource from "./cluster/renderer/shaders/texture01.frag";
import fsOutline from "./cluster/renderer/shaders/eOutline.frag";
import vsPost from "./cluster/renderer/shaders/post.vert";

const charactersImage = Assets.image(SpritesheetImageURL);

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

class RendererGL {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;

  // shader programs
  private mainProgram: WebGLProgram | null = null;
  // private postProgram: WebGLProgram;

  // // VAO's
  // private spriteVAO: WebGLVertexArrayObject;
  // // private postVAO: WebGLVertexArrayObject;

  // // FBO's
  // private sceneFBO: WebGLFramebuffer;

  // // uniforms
  // private mainUniforms: {
  //   u_resolution: WebGLUniformLocation | null;
  //   u_texture: WebGLUniformLocation | null;
  //   u_matrix: WebGLUniformLocation | null;
  //   u_sheetSize: WebGLUniformLocation | null;
  //   u_spriteSize: WebGLUniformLocation | null;
  //   u_spriteIndex: WebGLUniformLocation | null;
  // };

  // private outlineUniforms: {
  //   u_texture: WebGLUniformLocation;
  // };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.initShaders();
  }

  private createProgram(): WebGLProgram {
    const { gl } = this;

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

  /**
   * Initializes the renderer, compiles shaders, sets up buffers, and creates FBOs.
   */
  public init(spritesheet: HTMLImageElement) {
    this.initShaders();
    this.initBuffers();
    this.initTextures(spritesheet);
    this.initFBO();
    this.cacheUniformLocations();
  }

  // compile and link the scene program and outline program
  private initShaders() {
    const gl = this.gl;

    // 1) Compile & link
    this.mainProgram = this.createProgram();

    // // 2) Look up and cache all the uniform locations
    // this.mainUniforms = {
    //   u_resolution: gl.getUniformLocation(this.mainProgram, "u_resolution"),
    //   u_texture: gl.getUniformLocation(this.mainProgram, "u_texture"),
    //   u_matrix: gl.getUniformLocation(this.mainProgram, "u_matrix"),
    //   u_sheetSize: gl.getUniformLocation(this.mainProgram, "u_sheetSize"),
    //   u_spriteSize: gl.getUniformLocation(this.mainProgram, "u_spriteSize"),
    //   u_spriteIndex: gl.getUniformLocation(
    //     this.mainProgram,
    //     "u_spriteIndex"
    //   ),
    // };

    // // 3) Bind the program and set any one‐off state
    // gl.useProgram(this.program);
    // gl.uniform1i(this.uTextureLoc, 0); // sampler2D → unit 0
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private initBuffers() {
    // create and bind the VAOs for the sprite and post-processing passes
  }

  private initTextures(spritesheet: HTMLImageElement) {
    // create the texture and configure the sprite from the spritesheet image
  }

  private initFBO(): void {
    // Create offscreen framebuffer and attach texture of canvas size
  }

  private cacheUniformLocations(): void {
    // Query and store uniform locations for both programs
  }

  /**
   * Set which sprite cell to render (column, row).
   */
  public setSpriteIndex(col: number, row: number): void {
    // gl.useProgram(sceneProgram); then gl.uniform2f(...)
  }

  /**
   * Set the 3x3 transform matrix for sprite placement.
   */
  public setTransform(matrix: number[]): void {
    // gl.useProgram(sceneProgram); then gl.uniformMatrix3fv(...)
  }

  /**
   * Set time uniform if needed.
   */
  public setTime(time: number): void {
    // gl.useProgram(sceneProgram); then gl.uniform1f(...)
  }

  /**
   * Render the sprite into the offscreen FBO.
   */
  private renderScenePass(): void {
    // Bind FBO, clear, use sceneProgram, bind VAO, draw
  }

  /**
   * Render the outline pass to the default framebuffer.
   */
  private renderOutlinePass(): void {
    // Bind default FB, clear, use outlineProgram, bind postVAO, draw
  }

  /**
   * Start the render loop.
   */
  public start(): void {
    const loop = (now: number) => {
      const time = now * 0.001;
      this.setTime(time);
      this.renderScenePass();
      this.renderOutlinePass();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
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

function createTexture(gl: WebGL2RenderingContext, img: HTMLImageElement) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flip the image vertically
  gl.texImage2D(
    gl.TEXTURE_2D, // target
    0, // level of detail
    gl.RGBA, // internal format
    gl.RGBA, // format of the pixel data
    gl.UNSIGNED_BYTE, // type of the pixel data
    charactersImage // image element
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

function makeFBO(gl: WebGL2RenderingContext, w: number, h: number) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("FBO incomplete");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex };
}

export default () => {
  Assets.onReady(() => {
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

    const texture = createTexture(gl, charactersImage); // create the texture

    // 2. Compile & link
    const sceneProgram = createProgram(gl, vsSource, fsSource);

    // 1. Build a buffer with clip-space XY + UV
    const fsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fsBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        // x,    y,    u,   v
        -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1,
        1, 1,
      ]),
      gl.STATIC_DRAW
    );

    // 2. Make a VAO for drawing that buffer
    const postVAO = gl.createVertexArray();
    gl.bindVertexArray(postVAO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);

    // 3. Compile the outline pass as a post-processing program:
    const outlineProgram = createProgram(gl, vsPost, fsOutline);

    const sceneFBO = makeFBO(gl, display.width, display.height);

    gl.useProgram(sceneProgram);

    // 3.1 look up resolution, matrix, time, and texture locations
    const uResolutionLoc = gl.getUniformLocation(sceneProgram, "u_resolution");
    const uMatrixLoc = gl.getUniformLocation(sceneProgram, "u_matrix");
    const uTimeLoc = gl.getUniformLocation(sceneProgram, "u_time");
    const uTextureLoc = gl.getUniformLocation(sceneProgram, "u_texture");
    const uSheetSizeLoc = gl.getUniformLocation(sceneProgram, "u_sheetSize");
    const uSpriteSizeLoc = gl.getUniformLocation(sceneProgram, "u_spriteSize");
    const uSpriteIndexLoc = gl.getUniformLocation(
      sceneProgram,
      "u_spriteIndex"
    );

    gl.uniform1i(uTextureLoc, 0); // Set texture unit 0
    gl.uniform2f(uSheetSizeLoc, 3, 4); // Set the size of the spritesheet
    gl.uniform2f(uSpriteSizeLoc, 32, 32); // Set the size of each sprite
    gl.uniform2f(uSpriteIndexLoc, 0, 0); // Set the index of the sprite to use

    // 4. define position verices
    const positions = new Float32Array([
      // First triangle
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
      // Second triangle
      0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    // configure attribute pointer for position
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(0); // index of the attribute in the shader
    gl.vertexAttribPointer(
      0, // index of the attribute in the shader
      2, // size of each vertex (x, y)
      gl.FLOAT, // type of each component
      false, // normalize
      0, // stride (0 = tightly packed)
      0 // offset in the buffer
    );

    // 5. define corresponding uv coordinates
    const uvs = new Float32Array([
      // First triangle
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
      // Second triangle
      0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    ]);
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
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

    // 1) Create and bind the VAO
    const spriteVAO = gl.createVertexArray();
    gl.bindVertexArray(spriteVAO);

    // 2) Bind your position buffer and set up attrib 0
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(0); // location = 0 in your VS
    gl.vertexAttribPointer(
      0, // index
      2, // size (x,y)
      gl.FLOAT, // type
      false, // normalized?
      0, // stride
      0 // offset
    );

    // 3) Bind your UV buffer and set up attrib 1
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(1); // location = 1 in your VS
    gl.vertexAttribPointer(
      1, // index
      2, // size (u,v)
      gl.FLOAT, // type
      false, // normalized?
      0, // stride
      0 // offset
    );

    // 4) Unbind the VAO to lock it in
    gl.bindVertexArray(null);

    function render(now: number) {
      const time = now * 0.001;

      // COMPUTE your matrix exactly as you already have it:
      const spriteWidth = charactersImage.width / 3;
      const spriteHeight = charactersImage.height / 4;
      const centerX = (display.width - spriteWidth) * 0.5;
      const centerY = (display.height - spriteHeight) * 0.5;
      const radius = Math.min(centerX, centerY) - 20;
      const x = centerX + Math.cos(time) * radius;
      const y = centerY + Math.sin(time) * radius;
      const matrix = new Float32Array([
        spriteWidth,
        0,
        0,
        0,
        spriteHeight,
        0,
        x,
        y,
        1,
      ]);

      // ─── SCENE PASS ────────────────────────────────────────────
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.fbo);
      gl.viewport(0, 0, display.width, display.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(sceneProgram);

      // 1) Re-bind your sprite texture to unit 0
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // 2) Re-set every scene uniform
      gl.uniform1i(gl.getUniformLocation(sceneProgram, "u_texture"), 0);
      gl.uniform2f(
        gl.getUniformLocation(sceneProgram, "u_resolution"),
        display.width,
        display.height
      );
      gl.uniformMatrix3fv(
        gl.getUniformLocation(sceneProgram, "u_matrix"),
        false,
        matrix
      );
      gl.uniform2f(gl.getUniformLocation(sceneProgram, "u_sheetSize"), 3, 4);
      gl.uniform2f(gl.getUniformLocation(sceneProgram, "u_spriteIndex"), 0, 0);

      // 3) Draw your sprite quad
      gl.bindVertexArray(spriteVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // ─── OUTLINE PASS ───────────────────────────────────────────
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, display.width, display.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(outlineProgram);
      gl.bindVertexArray(postVAO);

      // Outline samples from the texture you just rendered into:
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
      gl.uniform1i(gl.getUniformLocation(outlineProgram, "u_texture"), 0);
      gl.uniform2f(
        gl.getUniformLocation(outlineProgram, "u_spriteSize"),
        spriteWidth,
        spriteHeight
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render); // start the render loop
  });
};
