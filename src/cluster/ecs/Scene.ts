import { Entity } from "./Entity";
import { System } from "./System";
import { Storage } from "./Storage";

// export class Scene {
//   private _layers: Map<string, Entity> = new Map();

//   private _systems: Map<string, System> = new Map();

//   public active: boolean = true;

//   public dead: boolean = false;

//   addLayer(layer: Entity): Scene {
//     if (!this._layers.has(layer.type)) {
//       this._layers.set(layer.type, layer);
//     }
//     return this;
//   }

//   removeLayer(name: string): Scene {
//     if (!this._layers.has(name)) {
//       throw new Error(`Scene: Layer "${name}" not found in scene`);
//     }
//     this._layers.delete(name);
//     return this;
//   }

//   getLayer(name: string): Entity | undefined {
//     return this._layers.get(name);
//   }

//   hasLayer(name: string): boolean {
//     return this._layers.has(name);
//   }

//   addSystem(system: System): Scene {
//     if (!this._systems.has(system.name)) {
//       this._systems.set(system.name, system);
//     }
//     return this;
//   }

//   removeSystem(name: string): Scene {
//     if (!this._systems.has(name)) {
//       throw new Error(`Scene: System "${name}" not found in scene`);
//     }
//     this._systems.delete(name);
//     return this;
//   }

//   getSystem(name: string): System | undefined {
//     return this._systems.get(name);
//   }

//   hasSystem(name: string): boolean {
//     return this._systems.has(name);
//   }

//   update(dt: number, t: number): void {
//     for (const layer of this._layers.values()) {
//       for (const system of this._systems.values()) {
//         if (layer.hasMask(system.mask, true)) {
//           system.update(layer, dt, t);
//         }
//       }
//       if (layer.dead) {
//         this.removeLayer(layer.type);
//       }
//     }
//   }
// }

export class Scene {
  private _layers: Map<string, Storage> = new Map();

  private _systems: Map<string, System> = new Map();

  public active: boolean = true;

  public dead: boolean = false;

  addLayer(layer: Storage): Scene {
    if (!this._layers.has(layer.type)) {
      this._layers.set(layer.type, layer);
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

  getLayer(type: string): Storage | undefined {
    return this._layers.get(type);
  }

  hasLayer(name: string): boolean {
    return this._layers.has(name);
  }

  addSystem(system: System): Scene {
    if (!this._systems.has(system.name)) {
      this._systems.set(system.name, system);
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
        system.update(layer, dt, t);
      }
    }
  }
}
