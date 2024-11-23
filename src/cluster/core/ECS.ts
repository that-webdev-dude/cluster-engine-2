interface IContainer<T> {
  children: Set<T>;
}

interface ISystem {
  type: string;
  update(entity: IEntity, dt?: number, t?: number): void;
}

interface IComponent {
  type: string;
}

interface IEntity {
  id: string;
  dead: boolean;
  active: boolean;
  components: Map<string, IComponent>;
  getComponent<T extends IComponent>(name: string): T | undefined;
  addComponent(component: IComponent): IEntity;
  removeComponent(name: string): IEntity;
  hasComponent(name: string): boolean;
}

interface IScene {
  systems: Map<string, ISystem>;
  type: string;
  dead: boolean;
  active: boolean;
  update(dt: number, t: number): void;
}

interface IGame {
  start: (updateCb: (dt: number) => void) => void;
  stop: () => void;
}

import { Display } from "./Display";
import { Engine } from "./Engine";
import { Assets } from "./Assets";
import { UUID } from "../tools/UUID";
import { Emitter } from "./Emitter";
import { Keyboard, Mouse } from "./Input";

/**
 * Container
 * @description A container is a generic class that holds a set of children.
 */
class Container<T> implements IContainer<T> {
  readonly children: Set<T>;

  constructor() {
    this.children = new Set<T>();
  }

  public add(child: T): Container<T> {
    this.children.add(child);
    return this;
  }

  public remove(child: T): Container<T> {
    this.children.delete(child);
    return this;
  }

  public forEach(fn: (child: T) => void): void {
    this.children.forEach(fn);
  }
}

/**
 * Entity
 * @description An entity is an id that holds a set of components and can have children entities.
 */
class Entity extends Container<Entity> implements IEntity {
  readonly id: string;
  readonly components: Map<string, Component>;
  public dead: boolean = false;
  public active: boolean = true;

  constructor() {
    super();
    this.id = UUID.generate();
    this.components = new Map<string, Component>();
  }

  public get type(): string {
    return this.constructor.name;
  }

  public addComponent(component: Component): Entity {
    this.components.set(component.type, component);
    return this;
  }

  public removeComponent(name: string): Entity {
    this.components.delete(name);
    return this;
  }

  public hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  public getComponent<T extends Component>(name: string): T | undefined {
    return this.components.get(name) as T;
  }
}

/**
 * System
 * @description A system is a class that updates entities.
 */
abstract class System implements ISystem {
  public get type(): string {
    return this.constructor.name;
  }

  public abstract update(entity: IEntity, dt: number, t: number): void;
}

/**
 * Component
 * @description A component is a class that holds raw data.
 */
class Component implements IComponent {
  public get type(): string {
    return this.constructor.name;
  }
}

/**
 * Scene
 * @description A scene is a class that holds a set of systems and entity containers (layers).
 */
class Scene implements IScene {
  readonly systems: Map<string, ISystem>;
  readonly layers: Map<string, IEntity>;

  constructor() {
    this.systems = new Map<string, ISystem>();
    this.layers = new Map<string, IEntity>();
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

  public get active(): boolean {
    // the scene is active if any of its layers are active
    for (const layer of this.layers.values()) {
      if (layer.active) {
        return true;
      }
    }
    return false;
  }

  addLayer(layer: IEntity): Scene {
    this.layers.set(layer.id, layer);
    return this;
  }

  removeLayer(layer: IEntity): Scene {
    this.layers.delete(layer.id);
    return this;
  }

  addSystem(system: ISystem): Scene {
    this.systems.set(system.type, system);
    return this;
  }

  removeSystem(system: ISystem): Scene {
    this.systems.delete(system.type);
    return this;
  }

  public update(dt: number, t: number): void {
    this.layers.forEach((layer) => {
      this.systems.forEach((system) => {
        system.update(layer, dt, t);
        if (layer.dead) {
          this.layers.delete(layer.id);
        }
      });
    });
  }
}

/**
 * Game
 * @description A game is a class that holds a set of scenes.
 */
class Game implements IGame {
  private _currentScene: IScene | null;
  private _nextScene: IScene | null;
  private _switching: boolean = false;

  constructor() {
    this._currentScene = null;
    this._nextScene = null;
    this._switching = false;
    Mouse.element = Display.view;
  }

  public get currentScene(): IScene | null {
    return this._currentScene;
  }

  public get nextScene(): IScene | null {
    return this._nextScene;
  }

  public setScene(scene: IScene): void {
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

      Emitter.processEvents();
      Keyboard.update();
      Mouse.update();
    };

    Assets.onReady(() => {
      Engine.start();
    });
  }

  public stop(): void {
    Emitter.clear();
    Engine.stop(); // ... maybe some form of cleanup function here
  }
}

export { Entity, Component, System, Scene, Game };
