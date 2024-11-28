import { Display } from "./cluster/core/Display";
import { Engine } from "./cluster/core/Engine";

type EntityId = number;

type ComponentType = string;

class Entity {
  id: EntityId;
  parent: EntityId | null;
  children: Set<EntityId>;
  componentMask: number; // bit mask of component types

  constructor(id: EntityId) {
    this.id = id;
    this.parent = null;
    this.children = new Set();
    this.componentMask = 0;
  }
}

class ComponentStorage<T> {
  private storage: Map<EntityId, T> = new Map();

  add(entityId: EntityId, component: T): void {
    this.storage.set(entityId, component);
  }

  remove(entityId: EntityId): void {
    this.storage.delete(entityId);
  }

  get(entityId: EntityId): T | undefined {
    return this.storage.get(entityId);
  }

  getAll(): [EntityId, T][] {
    return Array.from(this.storage.entries());
  }
}

interface System {
  requiredComponents: number; // Bitmask for required components
  update(entity: Entity, deltaTime: number): void;
}

class EntityManager {
  private entities: Map<EntityId, Entity> = new Map();
  private nextId: EntityId = 1;

  createEntity(): Entity {
    const entity = new Entity(this.nextId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  deleteEntity(id: EntityId): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    // Remove from parent's children if entity has a parent
    if (entity.parent !== null) {
      const parent = this.entities.get(entity.parent);
      parent?.children.delete(id);
    }

    // Remove from children recursively
    for (const childId of entity.children) {
      this.deleteEntity(childId);
    }

    this.entities.delete(id);
  }

  setParent(childId: EntityId, parentId: EntityId | null): void {
    const child = this.entities.get(childId);
    const parent = parentId !== null ? this.entities.get(parentId) : null;
    if (!child) return;

    // Remove from old parent
    if (child.parent !== null) {
      const oldParent = this.entities.get(child.parent);
      oldParent?.children.delete(childId);
    }

    // Add to new parent
    if (parent) {
      parent.children.add(childId);
    }

    child.parent = parentId;
  }

  setChild(parentId: EntityId, childId: EntityId): void {
    const parent = this.entities.get(parentId);
    const child = this.entities.get(childId);
    if (!parent || !child) return;

    parent.children.add(childId);
    child.parent = parentId;
  }

  setChildren(parentId: EntityId, children: EntityId[]): void {
    const parent = this.entities.get(parentId);
    if (!parent) return;

    for (const childId of children) {
      const child = this.entities.get(childId);
      if (child) {
        child.parent = parentId;
        parent.children.add(childId);
      }
    }
  }

  getRootEntities(): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.parent === null);
  }
}

class ComponentManager {
  private componentStores: Map<ComponentType, ComponentStorage<any>> =
    new Map();

  addComponent<T>(entityId: EntityId, type: ComponentType, component: T): void {
    if (!this.componentStores.has(type)) {
      this.componentStores.set(type, new ComponentStorage<T>());
    }
    const store = this.componentStores.get(type) as ComponentStorage<T>;
    store.add(entityId, component);
  }

  removeComponent(entityId: EntityId, type: ComponentType): void {
    const store = this.componentStores.get(type);
    store?.remove(entityId);
  }

  getComponent<T>(entityId: EntityId, type: ComponentType): T | undefined {
    const store = this.componentStores.get(type) as ComponentStorage<T>;
    return store?.get(entityId);
  }

  getEntitiesWithComponent(type: ComponentType): Set<EntityId> {
    const store = this.componentStores.get(type);
    return new Set(store?.getAll().map(([entityId]) => entityId));
  }
}

class ECSEngine {
  private entityStore: EntityManager;
  private componentStore: ComponentManager;
  private systems: System[] = [];

  constructor(entityStore: EntityManager, componentStore: ComponentManager) {
    this.entityStore = entityStore;
    this.componentStore = componentStore;
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  update(deltaTime: number): void {
    const rootEntities = this.entityStore.getRootEntities();

    for (const entity of rootEntities) {
      this.updateEntityRecursively(entity, deltaTime);
    }
  }

  private updateEntityRecursively(entity: Entity, deltaTime: number): void {
    for (const system of this.systems) {
      if (
        (entity.componentMask & system.requiredComponents) ===
        system.requiredComponents
      ) {
        system.update(entity, deltaTime);
      }
    }

    for (const childId of entity.children) {
      const child = this.entityStore.getEntity(childId);
      if (child) {
        this.updateEntityRecursively(child, deltaTime);
      }
    }
  }
}

// ------- Usage -------
// Constants for component bitmasks
const POSITION = 0b0001;
const OPACITY = 0b0010;

// Utility for random values
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Components
interface Position {
  x: number;
  y: number;
}

interface Opacity {
  value: number; // Between 0 (transparent) and 1 (fully opaque)
}

// Systems
class RenderSystem implements System {
  requiredComponents = POSITION | OPACITY;

  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d")!;
  }

  update(entity: Entity, deltaTime: number): void {
    const position = componentStore.getComponent<Position>(
      entity.id,
      "Position"
    );
    const opacity = componentStore.getComponent<Opacity>(entity.id, "Opacity");

    if (position && opacity) {
      this.context.globalAlpha = opacity.value;
      this.context.fillStyle = "black";
      this.context.fillRect(position.x, position.y, 20, 20); // Draw square
    }

    // this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

class FadeSystem implements System {
  requiredComponents = OPACITY | POSITION;

  update(entity: Entity, deltaTime: number): void {
    const opacity = componentStore.getComponent<Opacity>(entity.id, "Opacity");
    const position = componentStore.getComponent<Position>(
      entity.id,
      "Position"
    );

    if (opacity && position) {
      opacity.value -= 0.5 * deltaTime; // Fade out over time

      if (opacity.value <= 0) {
        // Respawn with full opacity at a random position
        opacity.value = 1;
        position.x = getRandomInt(0, 780); // Assuming canvas width is 800
        position.y = getRandomInt(0, 580); // Assuming canvas height is 600
      }
    }
  }
}

// Enhanced Render System
class EnhancedRenderSystem implements System {
  requiredComponents = POSITION | OPACITY;

  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private backgroundColor = { r: 0, g: 0, b: 0 };
  private shakeOffset = { x: 0, y: 0 };

  constructor() {
    this.canvas = Display.view;
    this.context = Display.context;
    window.addEventListener("resize", this.handleResize.bind(this));
    this.handleResize(); // Set initial canvas size
  }

  handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clearCanvas(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Change background color gradually
    this.backgroundColor.r = (this.backgroundColor.r + 1) % 256;
    this.backgroundColor.g = (this.backgroundColor.g + 2) % 256;
    this.backgroundColor.b = (this.backgroundColor.b + 3) % 256;

    this.context.fillStyle = `rgb(${this.backgroundColor.r}, ${this.backgroundColor.g}, ${this.backgroundColor.b})`;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  applyShakeEffect(): void {
    this.shakeOffset.x = Math.random() * 10 - 5;
    this.shakeOffset.y = Math.random() * 10 - 5;
  }

  resetShakeEffect(): void {
    this.shakeOffset.x = 0;
    this.shakeOffset.y = 0;
  }

  update(entity: Entity, deltaTime: number): void {
    const position = componentStore.getComponent<Position>(
      entity.id,
      "Position"
    );
    const opacity = componentStore.getComponent<Opacity>(entity.id, "Opacity");

    if (position && opacity) {
      this.context.save();

      // Apply camera shake
      this.context.translate(this.shakeOffset.x, this.shakeOffset.y);

      // Draw the entity
      this.context.globalAlpha = opacity.value;
      this.context.fillStyle = "black";
      const size = 20 + (1 - opacity.value) * 30; // Scale effect as it fades
      this.context.fillRect(position.x, position.y, size, size);

      this.context.restore();
    }
  }
}

// Enhanced Fade System with Respawn Effects
class EnhancedFadeSystem implements System {
  requiredComponents = OPACITY | POSITION;

  private renderSystem: EnhancedRenderSystem;

  constructor(renderSystem: EnhancedRenderSystem) {
    this.renderSystem = renderSystem;
  }

  update(entity: Entity, deltaTime: number): void {
    const opacity = componentStore.getComponent<Opacity>(entity.id, "Opacity");
    const position = componentStore.getComponent<Position>(
      entity.id,
      "Position"
    );

    if (opacity && position) {
      opacity.value -= 0.5 * deltaTime; // Fade out over time

      if (opacity.value <= 0) {
        // Apply respawn effects
        opacity.value = 1;
        position.x = getRandomInt(0, Display.width - 50); // Ensure within bounds
        position.y = getRandomInt(0, Display.height - 50);

        // Trigger camera shake
        const shakeDuration = 300; // milliseconds
        const shakeInterval = setInterval(() => {
          this.renderSystem.applyShakeEffect();
        }, 50);

        setTimeout(() => {
          clearInterval(shakeInterval);
          this.renderSystem.resetShakeEffect();
        }, shakeDuration);
      }
    }
  }
}

// Game Setup
const entityStore = new EntityManager();
const componentStore = new ComponentManager();
const renderSystem = new EnhancedRenderSystem();
const fadeSystem = new EnhancedFadeSystem(renderSystem);
const engine = new ECSEngine(entityStore, componentStore);

engine.addSystem(renderSystem);
engine.addSystem(fadeSystem);

// Create the scene and player entities
const sceneEntity = entityStore.createEntity();

// Create background and main layers
const backgroundLayer = entityStore.createEntity();

const mainLayer = entityStore.createEntity();

entityStore.setChildren(sceneEntity.id, [backgroundLayer.id, mainLayer.id]);

// Create the player entity
const playerEntity = entityStore.createEntity();

componentStore.addComponent(playerEntity.id, "Position", { x: 100, y: 100 });
componentStore.addComponent(playerEntity.id, "Opacity", { value: 1 });

playerEntity.componentMask |= POSITION | OPACITY;

entityStore.setChildren(mainLayer.id, [playerEntity.id]);

export default () => {
  // Game Loop
  Engine.update = (deltaTime: number) => {
    renderSystem.clearCanvas();
    engine.update(deltaTime);
  };

  Engine.start();
};
