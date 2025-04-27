import { Display } from "./cluster/core/Display";
import { Assets } from "./cluster/core/Assets";
// import vsSource from "./cluster/renderer/shaders/simple01.vert";
// import fsSource from "./cluster/renderer/shaders/simple01.frag";
import vsSource from "./cluster/renderer/shaders/texture01.vert";
import fsSource from "./cluster/renderer/shaders/eOutline.frag";
import SpritesheetImageURL from "./images/characters.png";

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
    const program = createProgram(gl, vsSource, fsSource);
    gl.useProgram(program);

    // 3.1 look up resolution, matrix, time, and texture locations
    const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const uMatrixLoc = gl.getUniformLocation(program, "u_matrix");
    const uTimeLoc = gl.getUniformLocation(program, "u_time");
    const uTextureLoc = gl.getUniformLocation(program, "u_texture");
    const uSheetSizeLoc = gl.getUniformLocation(program, "u_sheetSize");
    const uSpriteSizeLoc = gl.getUniformLocation(program, "u_spriteSize");
    const uSpriteIndexLoc = gl.getUniformLocation(program, "u_spriteIndex");

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

    // simulate a renderer loop
    function render(nowMs: number) {
      const time = nowMs * 0.001; // convert to seconds

      renderer.resize(display.width, display.height); // resize the canvas
      renderer.clear(); // clear the canvas

      // compute the transformation matrix
      // - scale quad to fit the image natural size
      // - translate it in a circle around the center of the canvas
      const spriteWidth = charactersImage.width / 3; // 4 sprites in the row
      const spriteHeight = charactersImage.height / 4; // 4 sprites in the column
      const centerX = (display.width - spriteWidth) * 0.5;
      const centerY = (display.height - spriteHeight) * 0.5;
      const radius = Math.min(centerX, centerY) - 20;

      const x = centerX + Math.cos(time) * radius;
      const y = centerY + Math.sin(time) * radius;

      // build a 3x3 transformation matrix
      // w,0,0,
      // 0,h,0,
      // x,y,1
      const matrix = new Float32Array([
        spriteWidth,
        0,
        0, // w,0,0,
        0,
        spriteHeight,
        0, // 0,h,0,
        x,
        y,
        1, // x,y,1
      ]);

      // …later in your render loop…
      if (uResolutionLoc !== null) {
        gl.uniform2f(uResolutionLoc, display.width, display.height);
      }
      if (uMatrixLoc !== null) {
        gl.uniformMatrix3fv(uMatrixLoc, false, matrix);
      }
      if (uTimeLoc !== null) {
        gl.uniform1f(uTimeLoc, time);
      }

      // bind the texture and draw the triangles
      gl.activeTexture(gl.TEXTURE0); // activate texture unit 0
      gl.bindTexture(gl.TEXTURE_2D, texture); // bind the texture to the unit
      gl.drawArrays(gl.TRIANGLES, 0, 6); // draw the triangles

      requestAnimationFrame(render); // request the next frame
    }

    requestAnimationFrame(render); // start the render loop
  });
};
