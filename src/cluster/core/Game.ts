import { Engine } from "./Engine";

export class Game {
  private engine: Engine;

  constructor() {
    this.engine = new Engine();
  }

  private update = (delta: number): void => {
    // Update your game logic
  };

  private render = (alpha: number): void => {
    // Render your game interpolated between states
  };

  public start(): void {
    this.engine.start();
  }

  public stop(): void {
    this.engine.stop();
  }

  public getFPS(): number {
    return this.engine.getFPS();
  }
}
