const MAX_INSTANCES = 50000;
// offset(2) + rotScale(4) + texRegion(4) + pivot(2) + extra offset(2)
const FLOATS_PER_INSTANCE = 2 + 4 + 4 + 2 + 2;

export class RendererGL {
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private instanceBuffer: WebGLBuffer;
  private projectionMatrix: Float32Array;
  private uProjectionLoc: WebGLUniformLocation;
  private uTextureLoc: WebGLUniformLocation;

  constructor(
    private canvas: HTMLCanvasElement,
    private image: HTMLImageElement
  ) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    // Compile & link shaders
    this.program = this.createProgram();
    this.uProjectionLoc = gl.getUniformLocation(this.program, "u_projection")!;
    this.uTextureLoc = gl.getUniformLocation(this.program, "u_texture")!;

    // Setup persistent GL state
    gl.useProgram(this.program);
    gl.uniform1i(this.uTextureLoc, 0); // sampler2D at texture unit 0
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create VAO, texture, and instance buffer
    this.vao = this.initVAO();
    this.texture = this.setupTexture();
    this.instanceBuffer = this.createInstanceBuffer();

    // Compute and upload initial projection matrix
    this.projectionMatrix = this.createOrtho(canvas.width, canvas.height);
    gl.uniformMatrix4fv(this.uProjectionLoc, false, this.projectionMatrix);

    // Bind VAO and texture once
    gl.bindVertexArray(this.vao);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Handle canvas resizing
    window.addEventListener("resize", () => {
      this.resize(canvas.width, canvas.height);
    });
  }

  private resize(width: number, height: number) {
    const gl = this.gl;
    this.projectionMatrix = this.createOrtho(width, height);
    gl.viewport(0, 0, width, height);
    gl.uniformMatrix4fv(this.uProjectionLoc, false, this.projectionMatrix);
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    const vsSource = `#version 300 es
      layout(location = 0) in vec2 a_position;
      layout(location = 1) in vec2 a_texcoord;
      layout(location = 2) in vec2 a_offset;
      layout(location = 3) in vec4 a_rotScale;
      layout(location = 4) in vec4 a_texRegion;
      layout(location = 5) in vec2 a_pivot;
      layout(location = 6) in vec2 a_offset2;

      uniform mat4 u_projection;
      out vec2 v_texcoord;

      void main() {
        float r = a_rotScale.x;
        float c = cos(r), s = sin(r);
        mat2 rot = mat2(c, -s, s, c);

        vec2 size  = vec2(a_rotScale.y, a_rotScale.z);
        vec2 pivot = a_pivot * size;

        vec2 localPos = a_position * size - pivot;
        vec2 rotated  = rot * localPos;
        vec2 pos      = rotated + a_offset + a_offset2 + pivot;

        gl_Position = u_projection * vec4(pos, 0.0, 1.0);
        v_texcoord  = a_texcoord * a_texRegion.zw + a_texRegion.xy;
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

    // Vertex quad: x,y,u,v
    const vertices = new Float32Array([
      0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,
    ]);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    // a_position @ 0
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    // a_texcoord @ 1
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(
      1,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );

    // Index buffer
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return vao;
  }

  private setupTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // align image origin with UVs
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

    const stride = FLOATS_PER_INSTANCE * Float32Array.BYTES_PER_ELEMENT;
    gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * stride, gl.DYNAMIC_DRAW);

    let offset = 0;
    // a_offset @ 2
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 2 * Float32Array.BYTES_PER_ELEMENT;

    // a_rotScale @ 3
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 4 * Float32Array.BYTES_PER_ELEMENT;

    // a_texRegion @ 4
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1);
    offset += 4 * Float32Array.BYTES_PER_ELEMENT;

    // a_pivot @ 5
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(5, 1);
    offset += 2 * Float32Array.BYTES_PER_ELEMENT;

    // a_offset2 @ 6
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(6, 1);

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
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData.data);

    gl.drawElementsInstanced(
      gl.TRIANGLES,
      6,
      gl.UNSIGNED_SHORT,
      0,
      instanceData.count
    );
  }
}
