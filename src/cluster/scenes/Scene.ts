// src/scenes/Scene.ts

import { Layer } from "./Layer";

export class Scene {
  private layers: Layer[] = [];

  /**
   * Add a new layer to the scene.
   */
  addLayer(layer: Layer): void {
    this.layers.push(layer);
    layer.onEnter();
  }

  /**
   * Remove a layer by name.
   */
  removeLayer(layerName: string): void {
    const idx = this.layers.findIndex((l) => l.name === layerName);
    if (idx !== -1) {
      this.layers[idx].onExit();
      this.layers.splice(idx, 1);
    }
  }

  /**
   * Retrieve a specific layer by name.
   */
  getLayer(layerName: string): Layer | undefined {
    return this.layers.find((l) => l.name === layerName);
  }

  /**
   * Update all layers.
   */
  update(delta: number): void {
    for (const layer of this.layers) {
      layer.update(delta);
    }
  }

  /**
   * Render all layers.
   */
  render(alpha: number): void {
    for (const layer of this.layers) {
      layer.render(alpha);
    }
  }
}
