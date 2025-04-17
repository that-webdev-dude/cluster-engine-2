/**
 * constant definition for the fullscreen shortcut key.
 */
const FULLSCREEN_SHORTCUT = "KeyF";

/**
 * Display
 *
 * Responsible for creating and managing a canvas element for rendering graphics.
 * Exposes the canvas and its rendering context which can be either 2D or WebGL.
 */
export class Display {
  // Singleton instance for global access.
  private static _instance: Display | null = null;

  // Holds the CSS selector of the parent element to attach the canvas.
  private _parentID: string = "body";

  // The canvas element that will be used for drawing.
  private _canvas: HTMLCanvasElement = document.createElement("canvas");

  // The rendering context of the canvas (either 2D or WebGL2).
  private _context: CanvasRenderingContext2D | WebGL2RenderingContext;

  // Holds the event listener reference used for toggling fullscreen.
  private _fullscreenHandler: (event: KeyboardEvent) => void = () => {};

  /**
   * Creates a new Display instance. Attaches a canvas element to the given parent element
   * (or defaults to document.body) and initializes the rendering context.
   *
   * @param {Object} options Configuration options.
   * @param {string} [options.parentID="body"] CSS selector for the parent element.
   * @param {number} [options.height=600] Height of the canvas element.
   * @param {number} [options.width=800] Width of the canvas element.
   * @param {("2d" | "webgl")} [options.type="2d"] The type of rendering context: "2d" for CanvasRenderingContext2D or "webgl" for WebGL.
   */
  public constructor({
    parentID = "body",
    height = 600,
    width = 800,
    type = "2d",
  }: {
    parentID?: string;
    height?: number;
    width?: number;
    type?: "2d" | "webgl2";
  }) {
    // Ensure the specified 2D or 3D context is available; otherwise, throw an error.
    const context = this._canvas.getContext(type);
    if (!context) {
      throw new Error(`[Display]: Failed to get ${type} context.`);
    }

    // sanity check for the context type support
    if (type === "webgl2" && !(context instanceof WebGL2RenderingContext)) {
      throw new Error(
        `[Display]: The specified context type is not supported by the browser.`
      );
    }
    if (type === "2d" && !(context instanceof CanvasRenderingContext2D)) {
      throw new Error(
        `[Display]: The specified context type is not supported by the browser.`
      );
    }

    // Assign the context to the class property.
    this._context = context as
      | CanvasRenderingContext2D
      | WebGL2RenderingContext;

    // Try to locate the parent element using the provided selector.
    if (parentID) {
      let appElement = document.querySelector(parentID) as HTMLElement;
      this._parentID = parentID;
      if (!appElement) {
        console.warn(
          `[Display]: Parent element with ID ${parentID} not found. Defaulting to body.`
        );
        appElement = document.body;
        this._parentID = "body";
      }

      // Set canvas dimensions.
      this._canvas.width = width;
      this._canvas.height = height;

      // Append the canvas element to the parent.
      appElement.appendChild(this._canvas);
    }

    // Initialize additional settings and event listeners.
    this._initialize();

    // Set the singleton instance.
    Display._instance = this;
  }

  /**
   * Returns the canvas element.
   */
  get view(): HTMLCanvasElement {
    return this._canvas;
  }

  /**
   * Returns the rendering context of the canvas (either 2D or WebGL2).
   */
  get context(): CanvasRenderingContext2D | WebGL2RenderingContext {
    return this._context;
  }

  /**
   * Returns the height of the canvas.
   */
  get height(): number {
    return this._context.canvas.height;
  }

  /**
   * Returns the width of the canvas.
   */
  get width(): number {
    return this._context.canvas.width;
  }

  /**
   * Performs initialization steps:
   * - Set up rendering properties for the canvas context based on whether it's 2D or WebGL.
   * - Binds and registers the fullscreen toggle event handler.
   */
  private _initialize() {
    // Set up canvas context rendering properties.
    if (this._context instanceof WebGL2RenderingContext) {
      // WebGL specific settings.
      const gl = this._context;
      // Set the clear color to black and fully opaque.
      gl.clearColor(0, 0, 0, 1);
      // Enable depth testing so that closer objects obscure farther ones.
      gl.enable(gl.DEPTH_TEST);
      // Set depth function to let nearer objects obscure further ones.
      gl.depthFunc(gl.LEQUAL);
      // Clear the color as well as the depth buffer.
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
      // 2D context specific settings.
      this._context.textBaseline = "top";
      this._context.imageSmoothingEnabled = false;
      this._context.imageSmoothingQuality = "high";
    }

    // Bind and store the fullscreen handler.
    this._fullscreenHandler = this._handleFullscreen.bind(this);
    // Register the keypress event to listen for the fullscreen toggle key.
    document.addEventListener("keypress", this._fullscreenHandler);
  }

  /**
   * Handles the keypress event and toggles fullscreen if the correct key is pressed.
   *
   * @param {KeyboardEvent} event The keypress event.
   */
  private _handleFullscreen(event: KeyboardEvent) {
    // Check if the pressed key matches the fullscreen shortcut.
    if (event.code === FULLSCREEN_SHORTCUT) {
      this._toggleFullScreen();
    }
  }

  /**
   * Toggles the fullscreen mode of the canvas.
   * Enters fullscreen if not already active, or exits fullscreen if currently active.
   */
  private _toggleFullScreen() {
    if (!document.fullscreenElement) {
      this._canvas.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /**
   * Cleans up resources by:
   * - Removing the keypress event listener.
   * - Detaching the canvas from the DOM.
   * - Nulling the context and canvas to assist with garbage collection.
   */
  public destroy() {
    document.removeEventListener("keypress", this._fullscreenHandler);
    const parent = document.querySelector(this._parentID);
    if (parent && this._canvas) {
      parent.removeChild(this._canvas);
    } else {
      console.warn(
        `[Display]: Parent element with ID ${this._parentID} not found. Cannot remove canvas.`
      );
    }
    // Nullify references to help with garbage collection.
    this._context = null as unknown as CanvasRenderingContext2D;
    this._canvas = null as unknown as HTMLCanvasElement;
  }

  /**
   * Returns the singleton instance of the Display.
   * If it doesn't exist, a new instance is created with default options.
   */
  public static getInstance(): Display {
    if (!Display._instance) {
      Display._instance = new Display({});
    }
    return Display._instance;
  }
}
