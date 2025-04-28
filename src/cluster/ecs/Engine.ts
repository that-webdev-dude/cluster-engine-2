// src/ecs/Engine.ts
import { System } from "./System";

export class Engine {
  private systems: System[] = [];
  private lastTime = 0;

  /** Register a system to run each frame */
  addSystem(sys: System) {
    this.systems.push(sys);
    sys.init?.();
  }

  /** Kick off the main loop */
  public start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.step);
  }

  private step = (now: number) => {
    const delta = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;

    // 1) Update all systems
    for (const sys of this.systems) {
      sys.update(delta);
    }

    // 2) Queue next frame
    requestAnimationFrame(this.step);
  };

  /** Tear down all systems */
  public stop() {
    for (const sys of this.systems) {
      sys.destroy?.();
    }
  }
}
