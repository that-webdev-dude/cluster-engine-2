/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

/**
 * IUpdateable interface defines an object that can be updated.
 */
interface IUpdateable {
  update: (delta: number) => void;
}

/**
 * IRenderable interface defines an object that can be rendered.
 */
interface IRenderable {
  render: (alpha: number) => void;
}

/**
 * Engine class implements a fixed timestep loop for updating and rendering.
 *
 * It decouples update and render cycles using an accumulator pattern. When debug mode is enabled,
 * runtime performance metrics (FPS, total frames, and elapsed time) are tracked.
 */
export class Engine {
  private readonly timestep: number;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private rafId: number | null = null;

  // updateables and renderables arrays
  private updateables: IUpdateable[] = [];
  private renderables: IRenderable[] = [];

  // Debug utilities
  private frameCount: number = 0;
  private elapsedTime: number = 0;
  private fps: number = 0;
  private fpsUpdateInterval: number = 0.5; // seconds
  private fpsAccumulator: number = 0;

  /**
   * Creates an instance of Engine.
   *
   * @param update - Function to update the engine state.
   * @param render - Function to render the current state.
   * @param updatesPerSecond - The update frequency in Hz (default is 60).
   */
  constructor(updatesPerSecond = 60) {
    this.timestep = 1 / updatesPerSecond;
  }

  /**
   * Adds an updateable object to the engine.

   * @param updateable - An object that implements the IUpdateable interface.
   */
  public addUpdateable(updateable: IUpdateable): void {
    this.updateables.push(updateable);
  }

  /**
   * Adds a renderable object to the engine.
   *
   * @param renderable - An object that implements the IRenderable interface.
   */
  public addRenderable(renderable: IRenderable): void {
    this.renderables.push(renderable);
  }

  // TODO:
  // implement the removeUpdateable and removeRenderable methods if needed here

  /**
   * Starts the engine's main loop.
   */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.resetTimers();
    this.loop(performance.now());
  }

  /**
   * Stops the engine's main loop.
   */
  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.destroy();
  }

  /**
   * Returns the current frames per second (FPS).
   *
   * @returns The calculated FPS.
   */
  public getFPS(): number {
    return this.fps;
  }

  /**
   * Returns the total number of frames rendered during the last debug interval.
   *
   * @returns The frame count.
   */
  public getTotalFrames(): number {
    return this.frameCount;
  }

  /**
   * Returns the elapsed time (in seconds) recorded during the last debug interval.
   *
   * @returns The elapsed time.
   */
  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Resets timing counters used for updating and tracking debug metrics.
   */
  private resetTimers(): void {
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.fpsAccumulator = 0;
    this.fps = 0;
  }

  /**
   * Main engine loop that processes update and render cycles.
   *
   * Uses requestAnimationFrame for smooth animations. The loop calculates the frame time,
   * limits the maximum frameTime to avoid spiral of death, accumulates any remaining time,
   * and processes update steps at a fixed timestep before rendering.
   *
   * @param currentTime - The current time in milliseconds provided by requestAnimationFrame.
   */
  private loop = (currentTime: number): void => {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(this.loop);

    let frameTime = (currentTime - this.lastTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25; // Avoid spiral of death
    this.lastTime = currentTime;

    this.accumulator += frameTime;
    this.elapsedTime += frameTime;
    this.fpsAccumulator += frameTime;
    this.frameCount++;

    while (this.accumulator >= this.timestep) {
      // this.update(this.timestep);
      this.updateables.forEach((updateable) =>
        updateable.update(this.timestep)
      );
      this.accumulator -= this.timestep;
    }

    const alpha = this.accumulator / this.timestep;
    // this.render(alpha);
    this.renderables.forEach((renderable) => renderable.render(alpha));

    if (DEBUG) this.updateFPS();
  };

  /**
   * Updates the FPS value based on the number of frames and elapsed time.
   *
   * This method resets the debug counters once the update interval is met.
   */
  private updateFPS(): void {
    if (this.fpsAccumulator >= this.fpsUpdateInterval) {
      this.fps = Math.round(this.frameCount / this.elapsedTime);
      this.fpsAccumulator = 0;
      this.frameCount = 0;
      this.elapsedTime = 0;
    }
  }

  /**
   * Destroys the engine instance and cleans up resources.
   *
   * This method stops the engine, clears the requestAnimationFrame ID, and resets the running state.
   * It also clears the update and render functions to prevent memory leaks.
   */
  public destroy(): void {
    this.updateables = [];
    this.renderables = [];
    this.resetTimers();
  }
}
