/**
 * RendererV3.ts
 *
 * This is a simple WebGL2 renderer.
 * It supports rendering of simple rectangles with solid colors (mesh) for now.
 * The GPU should be able to handle 1000s of instances at once.
 * The instance data is stored in a single buffer, which is then passed to the GPU for rendering.
 * The transformation matrix (translate, scale, rotate) is calculated on the GPU using a vertex shader.
 */

type RGBA = [number, number, number, number];

export class RendererV3 {
  private _bufWidth: number = 0;
  private _bufHeight: number = 0;
  private _aspectRatio: number = 0;
  private _depthEnabled = false;
  private _stencilEnabled = false;

  constructor(
    private gl: WebGL2RenderingContext,
    public background: RGBA = [0, 0, 0, 1]
  ) {
    this._bufWidth = gl.canvas.width;
    this._bufHeight = gl.canvas.height;
    this._aspectRatio = this._bufWidth / this._bufHeight;
    this._depthEnabled = gl.getParameter(gl.DEPTH_TEST);
    this._stencilEnabled = gl.getParameter(gl.STENCIL_TEST);

    this.init();
  }

  get width() {
    return this._bufWidth;
  }

  get height() {
    return this._bufHeight;
  }

  get aspectRatio() {
    return this._aspectRatio;
  }

  get depthEnabled() {
    return this._depthEnabled;
  }

  get stencilEnabled() {
    return this._stencilEnabled;
  }

  private init() {
    this.resize(this._bufWidth, this._bufHeight);
    this.clear();
  }

  private clear() {
    const [r, g, b, a] = this.background;
    this.gl.clearColor(r, g, b, a);

    let mask = this.gl.COLOR_BUFFER_BIT;
    if (this._depthEnabled) mask |= this.gl.DEPTH_BUFFER_BIT;
    if (this._stencilEnabled) mask |= this.gl.STENCIL_BUFFER_BIT;
    this.gl.clear(mask);
  }

  public resize(w: number, h: number) {
    this._bufWidth = w;
    this._bufHeight = h;
    this.gl.viewport(0, 0, w, h);
  }

  public destroy() {
    // any other cleanup…
  }
}
