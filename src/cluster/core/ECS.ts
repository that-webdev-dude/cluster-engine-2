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
 *
 *
 * ComponentStore
 * a class that holds a dictionary of component types and indices.
 *
 *
 */
class ComponentStore {
  private static _nextIndex: number = 1;

  static dictionary: Map<ComponentType, ComponentIndex> = new Map();

  static storage: Map<ComponentIndex, Map<EntityId, Component>> = new Map();

  static register(type: ComponentType): ComponentIndex {
    if (!type) {
      throw new Error("Component type must be a non-empty string.");
    }
    if (!ComponentStore.dictionary.has(type)) {
      ComponentStore.dictionary.set(type, ComponentStore._nextIndex++);
    }
    return ComponentStore.dictionary.get(type)!;
  }

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
  }

  static removeComponent(entityId: EntityId, index: ComponentIndex): void {
    const components = this.storage.get(index);
    if (components) {
      components.delete(entityId);
      if (components.size === 0) {
        this.storage.delete(index);
      }
    }
  }
}

/**
 *
 *
 * Entity
 * an ID that holds a set of components and children entities.
 *
 *
 */
class Entity {
  private static _nextId: EntityId = 1;
  private _mask: bigint = BigInt(0);
  private _dead: boolean = false;
  readonly id: EntityId = Entity._nextId++;
  readonly type: string = this.constructor.name;
  public active: boolean;
  public children: Set<Entity>;

  constructor() {
    this._mask = BigInt(0);
    this._dead = false;
    this.active = true;
    this.children = new Set();
  }

  public get mask(): bigint {
    return this._mask;
  }

  get dead(): boolean {
    return this._dead;
  }

  set dead(value: boolean) {
    // clear all components and ensure the ComponentStorage is updated
    // then set the dead flag to true to self and all children
    this._dead = value;
    if (value) {
      this._mask = BigInt(0);
      ComponentStore.storage.forEach((map) => {
        map.delete(this.id);
      });
    }
    this.children.forEach((child) => {
      child.dead = value;
    });
  }

  public getComponent<T>(type: ComponentType): T | undefined {
    const index = ComponentStore.dictionary.get(type);
    if (index === undefined) {
      console.warn(`Component type "${type}" is not registered.`);
      return undefined;
    }
    return ComponentStore.getComponent<T>(this.id, index);
  }

  public addComponent(...components: Component[]): Entity {
    for (const component of components) {
      ComponentStore.addComponent(this.id, component);
      this._mask |= BigInt(1) << BigInt(component.index);
    }
    return this;
  }

  public removeComponent(...components: Component[]): Entity {
    for (const component of components) {
      ComponentStore.removeComponent(this.id, component.index);
      this._mask &= ~(BigInt(1) << BigInt(component.index));
    }
    return this;
  }

  public addChild(...entities: Entity[]): Entity {
    for (const entity of entities) {
      this.children.add(entity);
    }
    return this;
  }

  public removeChild(...entities: Entity[]): Entity {
    for (const entity of entities) {
      this.children.delete(entity);
    }
    return this;
  }
}

/**
 *
 *
 * Component
 * an indexed type that holds raw data.
 *
 *
 */
abstract class Component {
  readonly index: number;
  readonly type: string;

  constructor(type?: string) {
    this.type = type || this.constructor.name;
    this.index = ComponentStore.register(this.type);
  }
}

/**
 *
 *
 * System
 * a class that updates entities.
 *
 *
 */
abstract class System {
  readonly type: string = this.constructor.name;
  private _mask: bigint;

  constructor(required: ComponentType[]) {
    this._mask = BigInt(0);
    for (const type of required) {
      const index = ComponentStore.dictionary.get(type);
      if (index === undefined) {
        console.warn(
          `Component type "${type}" not found during system initialization.`
        );
        continue;
      }
      this._mask |= BigInt(1) << BigInt(index);
    }
  }

  public get mask(): bigint {
    return this._mask;
  }

  public abstract update(entity: Entity, dt: number, t: number): void;
}

/**
 *
 *
 * Scene
 * a class that holds a set of systems and entity containers (layers).
 *
 *
 */
class Scene {
  readonly layers: Set<Entity>;
  readonly systems: Set<System>;
  public active: boolean = true;

  constructor() {
    this.layers = new Set();
    this.systems = new Set();
  }

  public get type(): string {
    return this.constructor.name;
  }

  public get dead(): boolean {
    return this.layers.size === 0;
  }

  public set dead(value: boolean) {
    if (value) {
      this.layers.clear();
    }
  }

  public addLayer(layer: Entity): void {
    this.layers.add(layer);
  }

  public removeLayer(layer: Entity): void {
    this.layers.delete(layer);
  }

  public addSystem(system: System): void {
    this.systems.add(system);
  }

  public removeSystem(system: System): void {
    this.systems.delete(system);
  }

  private _cleanup(): void {
    this.layers.forEach((layer) => {
      if (layer.dead) {
        this.layers.delete(layer);
      }
    });
  }

  public update(dt: number, t: number): void {
    this.layers.forEach((layer) => {
      this.systems.forEach((system) => {
        system.update(layer, dt, t);
      });
    });
    this._cleanup();
  }
}

/**
 *
 *
 * Game
 * a class that holds the current and next scene.
 *
 *
 */
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

  public stop(): void {
    this._emitter.clear();
    Engine.stop(); // ... maybe some form of cleanup function here
  }
}

export { Entity, Component, System, Scene, Game };
