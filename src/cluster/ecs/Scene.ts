import { Entity } from "./Entity";
import { System } from "./System";

export class Scene {
  private _layers: Map<string, Entity> = new Map();

  private _systems: Map<string, System> = new Map();

  public active: boolean = true;

  public dead: boolean = false;

  addLayer(name: string, layer: Entity): Scene {
    if (!this._layers.has(name)) {
      this._layers.set(name, layer);
    }
    return this;
  }

  removeLayer(name: string): Scene {
    if (!this._layers.has(name)) {
      throw new Error(`Scene: Layer "${name}" not found in scene`);
    }
    this._layers.delete(name);
    return this;
  }

  getLayer(name: string): Entity | undefined {
    return this._layers.get(name);
  }

  hasLayer(name: string): boolean {
    return this._layers.has(name);
  }

  addSystem(name: string, system: System): Scene {
    if (!this._systems.has(name)) {
      this._systems.set(name, system);
    }
    return this;
  }

  removeSystem(name: string): Scene {
    if (!this._systems.has(name)) {
      throw new Error(`Scene: System "${name}" not found in scene`);
    }
    this._systems.delete(name);
    return this;
  }

  getSystem(name: string): System | undefined {
    return this._systems.get(name);
  }

  hasSystem(name: string): boolean {
    return this._systems.has(name);
  }

  update(dt: number, t: number): void {
    for (const layer of this._layers.values()) {
      for (const system of this._systems.values()) {
        if (system.mask & layer.mask) {
          system.update(layer, dt, t);
        }
      }
    }
  }
}
