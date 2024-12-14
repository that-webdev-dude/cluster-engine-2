import { Display } from "./cluster/core/Display";
import { Engine } from "./cluster/core/Engine";
import { Assets } from "./cluster/core/Assets";
import { Store } from "./cluster/core/Store";
import { Mouse } from "./cluster/core/Input";
import { Keyboard } from "./cluster/core/Input";

type ComponentType = string;

type ComponentIndex = number;

type EntityId = number;

/** ComponentStore
 * a class that holds a dictionary of component types and indices.
 */
class ComponentStore {
  private static _nextIndex: number = 1;

  static dictionary: Map<ComponentType, ComponentIndex> = new Map();

  static storage: Map<ComponentIndex, Map<EntityId, Component>> = new Map();

  static register(type: ComponentType): ComponentIndex {
    if (!ComponentStore.dictionary.has(type)) {
      ComponentStore.dictionary.set(type, ComponentStore._nextIndex++);
    }
    return ComponentStore.dictionary.get(type)!;
  }

  static addComponent(entityId: EntityId, component: Component): void {
    const index = component.index;
    if (!this.storage.has(index)) {
      this.storage.set(index, new Map());
    }
    this.storage.get(index)!.set(entityId, component);
  }

  static getComponent<T>(
    entityId: EntityId,
    index: ComponentIndex
  ): T | undefined {
    return this.storage.get(index)?.get(entityId) as T | undefined;
  }

  static removeComponent(entityId: EntityId, index: ComponentIndex): void {
    this.storage.get(index)?.delete(entityId);
  }
}

/** Entity
 * an ID that holds a set of components and children entities.
 */
class Entity {
  private static _nextId: EntityId = 1;
  private _id: EntityId;
  private _mask: bigint;
  private _type: string;
  public dead: boolean;
  public children: Set<Entity>;

  constructor(type: string) {
    this._id = Entity._nextId++;
    this._mask = BigInt(0);
    this._type = type;
    this.dead = false;
    this.children = new Set();
  }

  private _updateMask(): void {
    this._mask = BigInt(0);
    for (const [index, storage] of ComponentStore.storage) {
      if (storage.has(this._id)) {
        this._mask |= BigInt(1) << BigInt(index);
      }
    }
  }

  public get id(): number {
    return this._id;
  }

  public get mask(): bigint {
    return this._mask;
  }

  public get type(): string {
    return this._type;
  }

  public get parent(): boolean {
    return this.children.size > 0;
  }

  // here
  public addComponent(component: Component): Entity {
    ComponentStore.addComponent(this._id, component);
    this._updateMask();
    return this;
  }

  public removeComponent(type: ComponentType): Entity {
    const index = ComponentStore.dictionary.get(type)!;
    ComponentStore.removeComponent(this._id, index);
    this._updateMask();
    return this;
  }
  // here

  public addComponents(...components: Component[]): Entity {
    for (const component of components) {
      this.addComponent(component);
    }
    return this;
  }

  public removeComponents(...components: Component[]): Entity {
    for (const component of components) {
      this.removeComponent(component.type);
    }
    return this;
  }

  public getComponent<T>(type: ComponentType): T | undefined {
    const index = ComponentStore.dictionary.get(type)!;
    return ComponentStore.getComponent<T>(this._id, index);
  }

  public addChildren(...entities: Entity[]): Entity {
    for (const entity of entities) {
      this.children.add(entity);
    }
    return this;
  }

  public deleteChildren(...entities: Entity[]): Entity {
    for (const entity of entities) {
      this.children.delete(entity);
    }
    return this;
  }
}

/** Component
 * an indexed type that holds raw data.
 */
abstract class Component {
  private _index: number;
  private _type: string;

  constructor(type: string) {
    this._index = ComponentStore.register(type);
    this._type = type;
  }

  public get index(): number {
    return this._index;
  }

  public get type(): string {
    return this._type;
  }
}

/** System
 *  a class that updates entities.
 */
abstract class System {
  private _mask: bigint;
  private _type: string;

  constructor(type: string, required: ComponentType[]) {
    this._type = type;
    this._mask = BigInt(0);
    for (const type of required) {
      if (!ComponentStore.dictionary.has(type)) {
        throw new Error(`Component type "${type}" not found in dictionary.`);
      }
      const index = ComponentStore.dictionary.get(type)!;
      this._mask |= BigInt(1) << BigInt(index);
    }
  }

  public get type(): string {
    return this._type;
  }

  public get mask(): bigint {
    return this._mask;
  }

  public abstract update(entity: Entity, dt: number, t: number): void;
}

/** Scene
 *  a class that holds a set of systems and entity containers (layers).
 */
class Scene {
  readonly entities: Set<Entity>;
  readonly systems: Set<System>;

  constructor() {
    this.entities = new Set();
    this.systems = new Set();
  }

  public get type(): string {
    return this.constructor.name;
  }

  public get dead(): boolean {
    return this.entities.size === 0;
  }

  public set dead(value: boolean) {
    if (value) {
      this.entities.clear();
    }
  }

  public update(dt: number, t: number): void {
    this.entities.forEach((entity) => {
      this.systems.forEach((system) => {
        system.update(entity, dt, t);
        if (entity.dead) {
          this.entities.delete(entity);
        }
      });
    });
  }
}

/** Game
 * a class that holds the current and next scene.
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

// Usage
class Position extends Component {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    super("position");
    this.x = x;
    this.y = y;
  }
}

class Velocity extends Component {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    super("velocity");
    this.x = x;
    this.y = y;
  }
}

class Style extends Component {
  fill: string;

  constructor(fill: string) {
    super("style");
    this.fill = fill;
  }
}

class Size extends Component {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    super("size");
    this.width = width;
    this.height = height;
  }
}

class RenderSystem extends System {
  constructor() {
    super("renderSystem", ["position", "size", "style"]);
  }

  update(entity: Entity, dt: number, t: number): void {
    if (!entity.parent && (entity.mask & this.mask) !== this.mask) return;

    let position = entity.getComponent<Position>("position") || undefined;

    let size = entity.getComponent<Size>("size") || undefined;

    if (position && size) {
      let style = entity.getComponent<Style>("style") || undefined;

      Display.context.fillStyle = style ? style.fill : "black";
      Display.context.fillRect(position.x, position.y, size.width, size.height);
    }

    for (const child of entity.children) {
      this.update(child, dt, t);
    }
  }
}

export default () => {
  ComponentStore.register("position");
  ComponentStore.register("velocity");
  ComponentStore.register("style");
  ComponentStore.register("size");

  const background = new Entity("background").addComponents(
    new Position(0, 0),
    new Size(Display.width, Display.height),
    new Style("grey")
  );

  const player = new Entity("player").addComponents(
    new Position(32, 32),
    new Velocity(0, 0),
    new Size(16, 16),
    new Style("white")
  );

  const backgroundLayer = new Entity("backgroundLayer").addChildren(background);

  const mainLayer = new Entity("mainLayer").addChildren(player);

  const scene = new Scene();
  scene.entities.add(backgroundLayer);
  scene.entities.add(mainLayer);
  scene.systems.add(new RenderSystem());

  scene.update(0, 0);
  // Display.clear();
};
