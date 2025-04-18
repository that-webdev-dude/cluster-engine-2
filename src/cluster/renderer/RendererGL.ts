/**
 * WebGL2 Instanced Renderer for batched sprites with packed rotation+scale in a vec4,
 * using bufferSubData for partial updates.
 */
const MAX_INSTANCES = 100000; // Maximum number of instances to support without reallocating

export class RendererGL {
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private instanceBuffer: WebGLBuffer;
  private projectionMatrix: Float32Array;
  private uProjectionLoc: WebGLUniformLocation;

  constructor(
    private canvas: HTMLCanvasElement,
    private image: HTMLImageElement
  ) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.program = this.createProgram();
    gl.useProgram(this.program);
    this.uProjectionLoc = gl.getUniformLocation(this.program, "u_projection")!;

    this.vao = this.initVAO();
    this.texture = this.setupTexture();
    this.instanceBuffer = this.createInstanceBuffer();

    this.projectionMatrix = this.createOrtho(canvas.width, canvas.height);
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    const vsSource = `#version 300 es
      layout(location = 0) in vec2 a_position;
      layout(location = 1) in vec2 a_texcoord;
      layout(location = 2) in vec2 a_offset;
      layout(location = 3) in vec4 a_rotScale; // x=rot, y=scaleX*w, z=scaleY*h, w unused
      layout(location = 4) in vec4 a_texRegion;
      uniform mat4 u_projection;
      out vec2 v_texcoord;
      void main() {
        float r = a_rotScale.x;
        float c = cos(r), s = sin(r);
        mat2 rot = mat2(c, -s, s, c);
        vec2 scaled = vec2(a_rotScale.y, a_rotScale.z) * a_position;
        vec2 pos = rot * scaled + a_offset;
        gl_Position = u_projection * vec4(pos, 0.0, 1.0);
        v_texcoord = a_texcoord * a_texRegion.zw + a_texRegion.xy;
      }`;
    const fsSource = `#version 300 es
      precision mediump float;
      in vec2 v_texcoord;
      uniform sampler2D u_texture;
      out vec4 outColor;
      void main() {
        outColor = texture(u_texture, v_texcoord);
      }`;

    const compileShader = (type: GLenum, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader)!);
      }
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program)!);
    }
    return program;
  }

  private initVAO(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    // 1) Create and fill the vertex buffer
    const vertices = new Float32Array([
      // x,  y,  u,  v
      0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,
    ]);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    // position @ location 0
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    // texcoord @ location 1
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(
      1,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );

    // 2) Create and fill the index buffer *while the VAO is still bound*
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // 3) Unbind VAO, but *do not* unbind ELEMENT_ARRAY_BUFFER here.
    gl.bindVertexArray(null);

    // You can unbind the ARRAY_BUFFER if you like:
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return vao;
  }

  private setupTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.image
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private createInstanceBuffer(): WebGLBuffer {
    const gl = this.gl;
    const buf = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);

    const strideBytes = (2 + 4 + 4) * Float32Array.BYTES_PER_ELEMENT;
    // Allocate once for maximum instances
    gl.bufferData(
      gl.ARRAY_BUFFER,
      MAX_INSTANCES * strideBytes,
      gl.DYNAMIC_DRAW
    );

    let offset = 0;
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, strideBytes, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 2 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, strideBytes, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 4 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, strideBytes, offset);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buf;
  }

  private createOrtho(w: number, h: number): Float32Array {
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

  public render(instanceData: { data: Float32Array; count: number }): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); // Set clear color to transparent
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const { data, count } = instanceData;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    // Partial update of instance data
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniformMatrix4fv(this.uProjectionLoc, false, this.projectionMatrix);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, count);
    gl.bindVertexArray(null);
  }
}
