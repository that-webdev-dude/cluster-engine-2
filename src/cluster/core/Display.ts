/**
 * constant definition for the fullscreen shortcut key.
 */
const FULLSCREEN_SHORTCUT = "KeyF";

/**
 * Display
 *
 * Responsible for creating and managing a canvas element for rendering graphics.
 */
export class Display {
  // Singleton instance for global access.
  private static _instance: Display | null = null;

  // Holds the CSS selector of the parent element to attach the canvas.
  private _parentID: string = "body";

  // The canvas element that will be used for drawing.
  private _canvas: HTMLCanvasElement = document.createElement("canvas");

  // the canvas width
  private _width: number = 800;

  // the canvas height
  private _height: number = 600;

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
  }: {
    parentID?: string;
    height?: number;
    width?: number;
  }) {
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

      // Cache the canvas dimensions.
      this._width = width;
      this._height = height;

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
   * Returns the height of the canvas.
   */
  get height(): number {
    return this._height;
  }

  /**
   * Returns the width of the canvas.
   */
  get width(): number {
    return this._width;
  }

  /**
   * Performs initialization steps:
   * - Binds and registers the fullscreen toggle event handler.
   */
  private _initialize() {
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
