type DisplayOptions = {
  parentElementId?: string;
  height?: number;
  width?: number;
};

class CDisplay {
  private static instance: CDisplay;
  readonly height: number;
  readonly width: number;
  readonly view: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;

  constructor({
    parentElementId = "#app",
    height = 640,
    width = 832,
  }: DisplayOptions = {}) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context)
      throw new Error("[Display Error]: Failed to get Canvas 2D context");

    if (parentElementId) {
      let appElement = document.querySelector(parentElementId) as HTMLElement;

      if (!appElement)
        throw new Error("[Display Error]: Failed to get HTML parent element");

      canvas.width = width;
      canvas.height = height;
      appElement.appendChild(canvas);
    }

    this.context = context;
    this.height = height;
    this.width = width;
    this.view = canvas;

    this._initialize();
  }

  private _initialize() {
    this.context.textBaseline = "top";
    this.context.imageSmoothingEnabled = false;
    document.addEventListener("keypress", (event) => {
      if (event.code === "KeyF") {
        this._toggleFullScreen();
      }
    });
  }

  private _toggleFullScreen() {
    if (!document.fullscreenElement) {
      this.view.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  public setSize(width: number, height: number) {
    CDisplay.getInstance().view.width = width;
    CDisplay.getInstance().view.height = height;
  }

  public static getInstance(options?: DisplayOptions): CDisplay {
    if (!CDisplay.instance) {
      CDisplay.instance = new CDisplay(options);
    }
    return CDisplay.instance;
  }

  public clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }
}

export const Display = CDisplay.getInstance();
