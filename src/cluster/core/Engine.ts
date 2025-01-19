type EngineOptions = {
  updateFn?: (dt: number, t: number) => void;
  renderFn?: () => void;
  fps?: number;
};

// pros:
// Global Access Point
// The Singleton pattern ensures there's a single instance of the Engine class that can be accessed globally.
// This is beneficial for managing game state and avoiding conflicts caused by multiple engine instances running simultaneously.

// Prevents Multiple Instances
// Since a game engine typically manages core processes like rendering, updates, and timing, having multiple instances could lead to inconsistencies or redundant operations.
// The Singleton ensures only one engine controls these operations.

// Resource Efficiency
// By ensuring only one instance exists, the Singleton helps conserve resources.
// For example, you avoid the overhead of initializing multiple render loops or update processes.

// Simplifies State Management
// Centralizing the Engine state simplifies synchronization and coordination across different parts of the application.

// cons:
// Hidden Dependencies
// Since the Singleton can be accessed globally, it introduces hidden dependencies.
// This makes the code harder to understand, test, and maintain because components may rely on the Engine instance implicitly.

// Difficult to Test
// Singleton classes are harder to test in isolation because they retain state across test runs.
// This can lead to unpredictable behavior and complicate unit testing.

// Tight Coupling
// Components that depend on the Singleton are tightly coupled to its implementation.
// If the Engine class needs to change, these dependencies may require significant refactoring.

// Concurrency Issues
// In multi-threaded applications, managing concurrent access to the Singleton instance
// can introduce synchronization challenges, potentially leading to race conditions.

// Viability in Large Projects
// As projects grow in complexity, relying on a Singleton for a core engine may limit flexibility.
// More modular or dependency-injection-based designs can scale better and adapt more easily to changes.

class CEngine {
  private static instance: CEngine;
  private _frameRequest: number | null;
  private _currentTime: number | null;
  private _elapsedTime: number;
  private _timeStep: number;
  private _updated: boolean;
  private _updates: number;
  private _update: (dt: number, t: number) => void;
  private _render: () => void;

  constructor(config: EngineOptions = {}) {
    const { updateFn = () => {}, renderFn = () => {}, fps = 60 } = config;
    this._frameRequest = null;
    this._currentTime = null;
    this._elapsedTime = 0;
    this._updated = false;
    this._timeStep = 1000 / fps; // 60fps = 1000 / 60 = 16.6667ms
    this._updates = 0;
    this._update = updateFn;
    this._render = renderFn;
  }

  public static getInstance(config?: EngineOptions): CEngine {
    if (!CEngine.instance) {
      CEngine.instance = new CEngine(config);
    }
    return CEngine.instance;
  }

  set update(update: (dt: number, t: number) => void) {
    this._update = update;
  }

  set render(render: () => void) {
    this._render = render;
  }

  // Fixed time step updating decouples the update logic (e.g., physics calculations) from the rendering loop.
  // Even if the frame rate fluctuates, the engine ensures that updates are applied in fixed, predictable increments.
  // This consistency helps maintain stable game behavior and prevents issues like faster or slower game speeds when the frame rate changes.
  // It also simplifies calculations for physics and collision detection by ensuring uniform time intervals.
  private _run = (timestamp: number) => {
    // If _currentTime is not set, it initializes it with the current time using window.performance.now()
    if (!this._currentTime) this._currentTime = window.performance.now();

    // This schedules the _run function to be called again on the next animation frame, creating a loop.
    this._frameRequest = window.requestAnimationFrame(this._run);

    // It calculates the time elapsed since the last frame by subtracting _currentTime from the current timestamp
    this._elapsedTime += timestamp - this._currentTime;
    this._currentTime = timestamp;
    this._updates = 0;

    // If the elapsed time is too large (more than three times the _timeStep), it caps it to _timeStep.
    // This prevents the game from trying to catch up too much if it falls behind, which could cause performance issues.
    if (this._elapsedTime >= this._timeStep * 3) {
      this._elapsedTime = this._timeStep;
    }

    // This loop ensures that the game state is updated in fixed time steps (_timeStep).
    // It subtracts _timeStep from _elapsedTime and calls the _update method with the time step in seconds.
    // If more than two updates are required in a single frame, it logs a warning and breaks out of the loop to prevent excessive updates.
    while (this._elapsedTime >= this._timeStep) {
      this._elapsedTime -= this._timeStep;
      this._update(this._timeStep / 1000, this._currentTime / 1000);
      if (++this._updates > 2) {
        console.warn("[CEngine]: Too many updates!");
        break;
      }
      this._updated = true;
    }

    if (this._updated) {
      if (this._render) this._render();
      this._updated = false;
    }
  };

  public start() {
    if (this._frameRequest === null) {
      this._currentTime = window.performance.now();
      // Synchronization with Display Refresh Rate:
      // requestAnimationFrame ensures that updates and rendering happen right before the next screen repaint. This synchronization minimizes visual tearing and stuttering.

      // Automatic Frame Rate Adjustment:
      // If the browser's refresh rate changes (e.g., from 60 fps to 30 fps), requestAnimationFrame automatically adjusts, unlike setTimeout or setInterval which use fixed intervals.
      this._frameRequest = window.requestAnimationFrame(this._run);
    }
  }

  public stop() {
    if (this._frameRequest !== null) {
      window.cancelAnimationFrame(this._frameRequest);
      this._frameRequest = null;
    }
  }
}

export const Engine = CEngine.getInstance();
