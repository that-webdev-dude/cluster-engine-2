// src/scenes/Layer.ts

import { World } from "../ecs/World";
import { System } from "../ecs/System";

export class Layer {
  readonly name: string;
  readonly world: World;
  visible: boolean = true;
  paused: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.world = new World();
  }

  /**
   * Lifecycle hook when the layer is entered.
   * Override or extend as needed.
   */
  onEnter(): void {
    // Initialization logic
  }

  /**
   * Lifecycle hook when the layer is exited.
   * Override or extend as needed.
   */
  onExit(): void {
    // Cleanup logic
  }

  /**
   * Add systems to this layer's ECS World.
   */
  addSystem(system: System): void {
    this.world.addSystem(system);
  }

  /**
   * Update entities within this layer.
   */
  update(delta: number): void {
    if (this.paused) return;
    this.world.update(delta);
  }

  /**
   * Render entities within this layer.
   */
  render(alpha: number): void {
    if (!this.visible) return;
    // Rendering logic handled by systems inside this world's render systems
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
