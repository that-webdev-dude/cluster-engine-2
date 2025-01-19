import { Display } from "./Display";
import { Engine } from "./Engine";
import { Assets } from "./Assets";
import { Store } from "./Store";
import { Mouse } from "./Input";
import { Keyboard } from "./Input";

type ComponentType = string;

type ComponentIndex = number;

type EntityId = number;

/**
 * Storage for efficient entity-component data management.
 * Indexing components with ComponentIndex instead of strings.
 * Storing components in maps for constant-time lookups (O(1)).
 * Caching system dependencies to avoid recalculating entity-component matches repeatedly.
 */
class Storage {
  private static _nextIndex: number = 1;

  // Retrieving data from a Map typically has a time complexity of O(1),
  // meaning it takes constant time regardless of the number of items stored.
  // This is why we say it supports "fast lookups."
  static dictionary: Map<ComponentType, ComponentIndex> = new Map();

  // Component indexing is necessary to store and retrieve components fast.
  // supports large numbers of components & fast lookups.
  static storage: Map<ComponentIndex, Map<EntityId, Component>> = new Map();

  // The caching mechanism (Storage.cache) speeds up entity lookups by storing precomputed results,
  // reducing the need to repeatedly scan or recalculate component data.
  static cache: Map<System, Set<Entity>> = new Map();

  // ...

  // Track systems that depend on each component index
  private static componentToSystems: Map<ComponentIndex, Set<System>> =
    new Map();

  // register a component type and return its index
  static register(type: ComponentType): ComponentIndex {
    if (!type) {
      throw new Error("Component type must be a non-empty string.");
    }
    if (!Storage.dictionary.has(type)) {
      Storage.dictionary.set(type, Storage._nextIndex++);
    }
    return Storage.dictionary.get(type)!;
  }

  // why generic type? to ensure type safety when retrieving components
  static getComponent<T>(
    entityId: EntityId,
    index: ComponentIndex
  ): T | undefined {
    return this.storage.get(index)?.get(entityId) as T | undefined;
  }

  static addComponent(entityId: EntityId, component: Component): void {
    const index = component.index;
    if (!this.storage.has(index)) {
      this.storage.set(index, new Map());
    }
    this.storage.get(index)!.set(entityId, component);
    this.invalidateCacheForComponent(index);
  }

  static removeComponent(entityId: EntityId, index: ComponentIndex): void {
    const components = this.storage.get(index);
    if (components) {
      components.delete(entityId);
      if (components.size === 0) {
        this.storage.delete(index);
      }
    }
    this.invalidateCacheForComponent(index);
  }

  // Register a system's dependencies when a system is created
  static registerSystemDependencies(system: System): void {
    for (const [type, index] of this.dictionary.entries()) {
      if ((system.mask & (BigInt(1) << BigInt(index))) !== BigInt(0)) {
        if (!this.componentToSystems.has(index)) {
          this.componentToSystems.set(index, new Set());
        }
        this.componentToSystems.get(index)!.add(system);
      }
    }
  }

  // Invalidate only the cache entries for systems that depend on the given component index
  static invalidateCacheForComponent(index: ComponentIndex): void {
    const systems = this.componentToSystems.get(index);
    if (systems) {
      for (const system of systems) {
        this.cache.delete(system);
      }
    }
  }

  // ...

  static getFilteredEntities(layers: Set<Entity>, system: System): Set<Entity> {
    if (this.cache.has(system)) {
      return this.cache.get(system)!;
    }

    const entitySet = new Set<Entity>();

    layers.forEach((layer) => {
      if (layer.hasChildrenWithComponents(system.mask)) {
        entitySet.add(layer);
      }
    });

    this.cache.set(system, entitySet);

    return entitySet;
  }

  static getFilteredEntitiesRecursive(
    layers: Set<Entity>,
    system: System
  ): Set<Entity> {
    if (this.cache.has(system)) {
      return this.cache.get(system)!;
    }

    const entitySet = new Set<Entity>();

    const traverse = (entity: Entity): void => {
      if (entity.hasChildrenWithComponents(system.mask)) {
        entitySet.add(entity);
      }

      entity.children.forEach((child) => traverse(child));
    };

    // Traverse each layer and its children
    layers.forEach((layer) => traverse(layer));

    this.cache.set(system, entitySet);

    return entitySet;
  }

  // Delete an entity and remove all its components from the storage
  static deleteEntity(entityId: EntityId): void {
    for (const [index, components] of this.storage.entries()) {
      if (components.has(entityId)) {
        components.delete(entityId);
        this.invalidateCacheForComponent(index);
      }
    }
  }
}

abstract class Entity {
  private static _nextId: EntityId = 1;

  private _id: EntityId;
  private _active: boolean;
  private _dead: boolean;
  private _mask: bigint;
  private _type: string;
  private _children: Set<Entity>;

  constructor(type?: string) {
    this._id = Entity._nextId++;
    this._type = type || this.constructor.name;
    this._mask = BigInt(0);
    this._dead = false;
    this._active = true;
    this._children = new Set();
  }

  get id(): EntityId {
    return this._id;
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
  }

  get dead(): boolean {
    return this._dead;
  }

  set dead(value: boolean) {
    this._dead = value;
  }

  get mask(): bigint {
    return this._mask;
  }

  get type(): string {
    return this._type;
  }

  get children(): Set<Entity> {
    return this._children;
  }

  getComponent<T>(type: ComponentType): T | undefined {
    const index = Storage.dictionary.get(type);
    if (index === undefined) {
      console.warn(`Component type "${type}" is not registered.`);
      return undefined;
    }
    return Storage.getComponent<T>(this.id, index);
  }

  addComponent(...components: Component[]): Entity {
    for (const component of components) {
      Storage.addComponent(this.id, component);
      this._mask |= BigInt(1) << BigInt(component.index);
    }
    return this;
  }

  removeComponent(...components: Component[]): Entity {
    for (const component of components) {
      Storage.removeComponent(this.id, component.index);
      this._mask &= ~(BigInt(1) << BigInt(component.index));
    }
    return this;
  }

  addChild(...entities: Entity[]): Entity {
    for (const entity of entities) {
      this._children.add(entity);
    }
    return this;
  }

  removeChild(...entities: Entity[]): Entity {
    for (const entity of entities) {
      this._children.delete(entity);
    }
    return this;
  }

  hasChildrenWithComponents(mask: bigint): boolean {
    if ((this.mask & mask) === mask) {
      return true;
    }
    for (const child of this.children) {
      if (child.hasChildrenWithComponents(mask)) {
        return true;
      }
    }
    return false;
  }

  destroy(): void {
    Storage.deleteEntity(this.id);
    // Optionally, add other cleanup logic if necessary.
  }

  // Implement additional methods as needed
}

// class Entity {
//   private static _nextId: EntityId = 1;
//   readonly id: EntityId = Entity._nextId++;
//   readonly children: Set<Entity>;
//   // ... other properties and methods
//   readonly type: string;
//   private _mask: bigint = BigInt(0);
//   private _dead: boolean = false;
//   public active: boolean;

//   constructor(type?: string) {
//     this.type = type || this.constructor.name;
//     this._mask = BigInt(0);
//     this._dead = false;
//     this.active = true;
//     this.children = new Set();
//   }

//   public get mask(): bigint {
//     return this._mask;
//   }

//   public get dead(): boolean {
//     return this._dead;
//   }

//   // TODO: Implement a deferred cleanup mechanism to ensure that the entity is not removed from the scene while it is being processed.
//   // probably a defeerrd cleanup should be implemented here
//   // to ensure that the entity is not removed from the scene while it is being processed
//   public set dead(value: boolean) {
//     // clear all components and ensure the ComponentStorage is updated
//     // then set the dead flag to true to self and all children
//     this._dead = value;
//     if (value) {
//       this._mask = BigInt(0);
//       Storage.storage.forEach((map) => {
//         map.delete(this.id);
//       });
//     }
//     this.children.forEach((child) => {
//       child.dead = value;
//     });
//   }

//   public getComponent<T>(type: ComponentType): T | undefined {
//     const index = Storage.dictionary.get(type);
//     if (index === undefined) {
//       console.warn(`Component type "${type}" is not registered.`);
//       return undefined;
//     }
//     return Storage.getComponent<T>(this.id, index);
//   }

//   public addComponent(...components: Component[]): Entity {
//     for (const component of components) {
//       Storage.addComponent(this.id, component);
//       this._mask |= BigInt(1) << BigInt(component.index);
//     }
//     return this;
//   }

//   public removeComponent(...components: Component[]): Entity {
//     for (const component of components) {
//       Storage.removeComponent(this.id, component.index);
//       this._mask &= ~(BigInt(1) << BigInt(component.index));
//     }
//     return this;
//   }

//   public addChild(...entities: Entity[]): Entity {
//     for (const entity of entities) {
//       this.children.add(entity);
//     }
//     return this;
//   }

//   public removeChild(...entities: Entity[]): Entity {
//     for (const entity of entities) {
//       this.children.delete(entity);
//     }
//     return this;
//   }

//   public hasChildrenWithComponents(mask: bigint): boolean {
//     if ((this.mask & mask) === mask) {
//       return true;
//     }
//     for (const child of this.children) {
//       if (child.hasChildrenWithComponents(mask)) {
//         return true;
//       }
//     }
//     return false;
//   }

//   public destroy(): void {
//     Storage.deleteEntity(this.id);
//     // Optionally, add other cleanup logic if necessary.
//   }
// }

abstract class Component {
  readonly index: number;
  readonly type: string;

  constructor(type?: string) {
    this.type = type || this.constructor.name;
    this.index = Storage.register(this.type);
  }
}

abstract class System {
  private _mask: bigint;

  constructor(required: ComponentType[]) {
    this._mask = BigInt(0);
    for (const type of required) {
      const index = Storage.dictionary.get(type);
      if (index === undefined) {
        console.warn(
          `Component type "${type}" not found during system initialization.`
        );
        continue;
      }
      this._mask |= BigInt(1) << BigInt(index);
    }

    // Register the system's dependencies
    Storage.registerSystemDependencies(this);
  }

  public get mask(): bigint {
    return this._mask;
  }

  public abstract update(entity: Entity, dt: number, t: number): void;
}

class Scene {
  readonly layers: Set<Entity>;
  readonly systems: Set<System>;
  readonly type: string;
  public active: boolean = true;

  constructor(type?: string) {
    this.type = type || this.constructor.name;
    this.layers = new Set();
    this.systems = new Set();
  }

  public get dead(): boolean {
    return this.layers.size === 0;
  }

  public set dead(value: boolean) {
    if (value) {
      this.layers.clear();
      Storage.cache.clear(); // Clear the entire cache since the scene is being wiped.
    }
  }

  public addLayer(...layers: Entity[]): void {
    for (const entity of layers) {
      this.layers.add(entity);
    }
    this.invalidateAffectedSystems();
  }

  public removeLayer(...layers: Entity[]): void {
    for (const entity of layers) {
      this.layers.delete(entity);
    }
    this.invalidateAffectedSystems();
  }

  public addSystem(...systems: System[]): void {
    for (const system of systems) {
      this.systems.add(system);
      Storage.registerSystemDependencies(system);
    }
    this.invalidateAffectedSystems();
  }

  public removeSystem(...systems: System[]): void {
    for (const system of systems) {
      this.systems.delete(system);
    }
    this.invalidateAffectedSystems();
  }

  private _cleanup(): void {
    [...this.layers]
      .filter((layer) => layer.dead)
      .forEach((layer) => this.layers.delete(layer));
    this.invalidateAffectedSystems();
  }

  public update(dt: number, t: number): void {
    this.systems.forEach((system) => {
      const qualifyingLayers = Storage.getFilteredEntities(this.layers, system);
      qualifyingLayers.forEach((layer) => {
        system.update(layer, dt, t);
      });
    });
    this._cleanup();
  }

  private invalidateAffectedSystems(): void {
    for (const system of this.systems) {
      Storage.cache.delete(system);
    }
  }
}

class Game {
  private _currentScene: Scene | null;
  private _nextScene: Scene | null;
  private _switching: boolean = false;
  private _emitter: Store;

  constructor(emitter: Store) {
    this._currentScene = null;
    this._nextScene = null;
    this._switching = false;
    this._emitter = emitter;

    Mouse.element = Display.view;
  }

  public get currentScene(): Scene | null {
    return this._currentScene;
  }

  public get nextScene(): Scene | null {
    return this._nextScene;
  }

  public setScene(scene: Scene): void {
    if (!this._currentScene) {
      this._currentScene = scene;
      return;
    }
    if (this._currentScene && !this._nextScene && !this._switching) {
      this._nextScene = scene;
      this._switching = true;
    }
  }

  public start(callback: (dt: number, t: number) => void): void {
    Engine.update = (dt: number, t: number) => {
      Display.clear();

      // Update the current scene
      if (this._currentScene) {
        this._currentScene.update(dt, t);
      }

      // If switching, also update the next scene
      if (this._switching && this._nextScene) {
        this._nextScene.update(dt, t);

        // Check if the current scene is dead
        if (this._currentScene?.dead) {
          // Swap scenes
          this._currentScene = this._nextScene;
          this._nextScene = null;
          this._switching = false; // Reset the switching flag
        }
      }

      callback(dt, t);

      this._emitter.processEvents();

      Keyboard.update();
      Mouse.update();
    };

    Assets.onReady(() => {
      Engine.start();
    });
  }

  // TODO: Implement a stop method to clean up resources and stop the game loop.
  public stop(): void {
    this._emitter.clear();
    Engine.stop(); // ... maybe some form of cleanup function here
  }
}

export { Entity, Component, System, Scene, Game };
