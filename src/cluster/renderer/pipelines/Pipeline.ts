// TODO: this is a work in progress. The goal is to create a reusable pipeline system for WebGL2.
// Batching & grouping
// Down the road, you might have multiple pipelines active (e.g. one for colored quads, one for textured sprites).
// You could buffer up all “quad” entities into one PSO, then switch pipelines only when needed—minimizing costly useProgram calls.

import vsSource from "../shaders/instanced-quad.vert.glsl";
import fsSource from "../shaders/instanced-quad.frag.glsl";

// Utility: compile a shader from source
function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("[RendererSystem]: Shader compile failed: " + info);
  }
  return shader;
}

// Utility: link vertex & fragment shaders into a program
function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram {
  const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error("[RendererSystem]: Program link failed: " + info);
  }
  return prog;
}

type PipelineSetter = (gl: WebGL2RenderingContext) => void;

export class Pipeline {
  private initialized = false;
  public readonly program: WebGLProgram;
  public readonly vao: WebGLVertexArrayObject;

  public constructor(
    gl: WebGL2RenderingContext,
    vsSource: string,
    fsSource: string,
    private setVAO: PipelineSetter,
    private setUniforms: PipelineSetter
  ) {
    this.program = createProgram(gl, vsSource, fsSource);
    gl.useProgram(this.program);

    // run the user‐supplied VAO configuration function
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.setVAO(gl);
    this.initialized = true;
    gl.bindVertexArray(null);
  }

  public bind(gl: WebGL2RenderingContext) {
    if (!this.initialized) {
      console.warn(
        `[Pipeline] bind() called before VAO was configured for program`,
        this.program
      );
    }
    gl.useProgram(this.program);
    this.setUniforms(gl);
    gl.bindVertexArray(this.vao);
  }

  public unbind(gl: WebGL2RenderingContext) {
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  public destroy(gl: WebGL2RenderingContext) {
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
    this.setVAO = () => {};
    this.setUniforms = () => {};
  }

  public onResize(width: number, height: number): void {
    // override this in subclasses to handle resize events
  }
}

/**
 * InstancedQuadPSO: a pipeline state object for rendering instanced quads.
 * This pipeline uses a single vertex buffer for the quad geometry, and a second buffer for the instance data.
 * The instance data includes position, scale, rotation, and color for each instance.
 * The vertex shader transforms the quad geometry using the instance data, and the fragment shader outputs the vertex color.
 */
export interface InstancedQuadPSO extends Pipeline {
  instanceBuffer: WebGLBuffer; // the buffer you need to upload each frame:
  floatsPerInstance: number; // the per‑instance stride:
  onResize: (width: number, height: number) => void; // handle resize events
  updateInstances: (
    gl: WebGL2RenderingContext,
    data: Float32Array,
    count: number
  ) => void;
}
class InstancedQuadPipeline extends Pipeline implements InstancedQuadPSO {
  public readonly floatsPerInstance: number;
  public readonly instanceBuffer: WebGLBuffer;
  private readonly uResLoc: WebGLUniformLocation;
  private height: number;
  private width: number;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    const quadBuffer = gl.createBuffer()!;
    const instanceBuf = gl.createBuffer()!;
    const FLOATS_PER_INSTANCE = 2 + 2 + 1 + 4;
    const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

    // call super to compile/link and do the VAO setup
    super(
      gl,
      vsSource,
      fsSource,
      // setVAO: only config VAO + buffers + attrib pointers
      (gl) => {
        // bind the quad buffer and set up the vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const quadVerts = new Float32Array([
          0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(0, 0); // not instanced

        // bind the instance buffer and set up the vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuf);
        gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);

        // Setup instance attributes
        let offset = 0;
        // a_position
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(
          1,
          2,
          gl.FLOAT,
          false,
          BYTES_PER_INSTANCE,
          offset
        );
        gl.vertexAttribDivisor(1, 1);
        offset += 2 * 4;
        // a_scale
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(
          2,
          2,
          gl.FLOAT,
          false,
          BYTES_PER_INSTANCE,
          offset
        );
        gl.vertexAttribDivisor(2, 1);
        offset += 2 * 4;
        // a_rotation
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(
          3,
          1,
          gl.FLOAT,
          false,
          BYTES_PER_INSTANCE,
          offset
        );
        gl.vertexAttribDivisor(3, 1);
        offset += 1 * 4;
        // a_color
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(
          4,
          4,
          gl.FLOAT,
          false,
          BYTES_PER_INSTANCE,
          offset
        );
        gl.vertexAttribDivisor(4, 1);

        // Unbind
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      },
      // setUniforms: only upload the resolution
      (gl) => {
        gl.uniform2f(this.uResLoc, this.width, this.height);
      }
    );

    // store the width and height for later use
    this.width = width;
    this.height = height;

    // cache u_resolution once
    this.uResLoc = gl.getUniformLocation(this.program, "u_resolution")!;
    this.instanceBuffer = instanceBuf;
    this.floatsPerInstance = FLOATS_PER_INSTANCE;
  }

  public updateInstances = (
    gl: WebGL2RenderingContext,
    data: Float32Array,
    count: number
  ) => {
    const byteLength = count * this.floatsPerInstance * 4;
    // orphan the old buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, byteLength, gl.DYNAMIC_DRAW);
    // upload only what we need
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      data.subarray(0, count * this.floatsPerInstance)
    );
  };

  public onResize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}

// export the pipeline as a singleton
export namespace Pipeline {
  export function createInstancedQuadPSO(
    gl: WebGL2RenderingContext,
    width: number,
    height: number
  ): InstancedQuadPSO {
    return new InstancedQuadPipeline(gl, width, height);
  }
}
