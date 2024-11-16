interface IContainer<T> {
  children: Set<T>;
}

interface IEngine {
  update: (dt: number, t: number) => void;
  start: (callback?: (dt: number, t: number) => void) => void;
  stop: () => void;
}

interface ISystem {
  type: string;
  update(entity: IEntity, dt?: number, t?: number): void;
}

interface IDisplay {
  height: number;
  width: number;
  view: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  clear(): void;
}

interface IComponent {
  type: string;
}

interface IEntity {
  id: string;
  components: Map<string, IComponent>;
}

interface IScene {
  systems: Map<string, ISystem>;
  update(dt: number, t: number): void;
}

interface IGame {
  start: (updateCb: (dt: number) => void) => void;
  stop: () => void;
}

import { Display } from "./Display";
import { Engine } from "./Engine";
import { Assets } from "./Assets";
import { Keyboard, Mouse } from "./Input";
import { UUID } from "../tools/UUID";

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
    this.systems.forEach((system) => {
      this.layers.forEach((layer) => {
        system.update(layer, dt, t);
      });
    });
  }
}

/**
 * Game
 * @description A game is a class that holds a set of scenes.
 */
class Game implements IGame {
  scenes: Map<string, IScene>;

  constructor() {
    this.scenes = new Map<string, IScene>();

    Mouse.element = Display.view;
  }

  public addScene(scene: IScene): Game {
    this.scenes.set(scene.constructor.name, scene);
    return this;
  }

  public removeScene(scene: IScene): Game {
    this.scenes.delete(scene.constructor.name);
    return this;
  }

  public start(callback: (dt: number) => void): void {
    Engine.update = (dt: number, t: number) => {
      this.scenes.forEach((scene) => {
        scene.update(dt, t);
      });
      Keyboard.update();
      Mouse.update();
      Display.clear();
      callback(dt);
    };

    Assets.onReady(() => {
      Engine.start();
    });
  }

  public stop(): void {
    // ... maybe some form of cleanup function here
    Engine.stop();
  }
}

export { Entity, Component, System, Scene, Game };
