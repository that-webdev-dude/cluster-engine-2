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
  private entityManager: EntityManager;
  private componentManager: ComponentManager;
  private systems: System[] = [];

  constructor(
    entityManager: EntityManager,
    componentManager: ComponentManager
  ) {
    this.entityManager = entityManager;
    this.componentManager = componentManager;
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  update(deltaTime: number): void {
    const rootEntities = this.entityManager.getRootEntities();

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
      const child = this.entityManager.getEntity(childId);
      if (child) {
        this.updateEntityRecursively(child, deltaTime);
      }
    }
  }
}

/**
 * Usage
 */
const entityManager = new EntityManager();
const componentManager = new ComponentManager();

/**
 * Components
 */
class PositionComponent {
  static type = "position";
  static index = 0b0001;

  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class SizeComponent {
  static type = "size";
  static index = 0b0100;

  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

class StyleComponent {
  static type = "style";
  static index = 0b1000;

  fill: string;
  stroke: string;

  constructor(fill: string, stroke: string) {
    this.fill = fill;
    this.stroke = stroke;
  }
}

/**
 * Systems
 */
class RenderSystem implements System {
  requiredComponents =
    PositionComponent.index | SizeComponent.index | StyleComponent.index;

  update(entity: Entity, deltaTime: number): void {
    const position = componentManager.getComponent<PositionComponent>(
      entity.id,
      PositionComponent.type
    );
    const size = componentManager.getComponent<SizeComponent>(
      entity.id,
      SizeComponent.type
    );
    const style = componentManager.getComponent<StyleComponent>(
      entity.id,
      StyleComponent.type
    );

    if (!position || !size || !style) return;

    Display.context.fillStyle = style.fill;
    Display.context.strokeStyle = style.stroke;
    Display.context.fillRect(position.x, position.y, size.width, size.height);
    Display.context.strokeRect(position.x, position.y, size.width, size.height);
  }
}

/**
 * Entities
 */
const backgroundEntity = entityManager.createEntity();
componentManager.addComponent(
  backgroundEntity.id,
  PositionComponent.type,
  new PositionComponent(0, 0)
);
componentManager.addComponent(
  backgroundEntity.id,
  SizeComponent.type,
  new SizeComponent(Display.width, Display.height)
);
componentManager.addComponent(
  backgroundEntity.id,
  StyleComponent.type,
  new StyleComponent("lightBlue", "transparent")
);
backgroundEntity.componentMask =
  StyleComponent.index | SizeComponent.index | PositionComponent.index;

const rectEntity = entityManager.createEntity();
componentManager.addComponent(
  rectEntity.id,
  PositionComponent.type,
  new PositionComponent(50, 50)
);
componentManager.addComponent(
  rectEntity.id,
  SizeComponent.type,
  new SizeComponent(100, 100)
);
componentManager.addComponent(
  rectEntity.id,
  StyleComponent.type,
  new StyleComponent("red", "black")
);
rectEntity.componentMask =
  StyleComponent.index | SizeComponent.index | PositionComponent.index;

entityManager.setChild(backgroundEntity.id, rectEntity.id);

console.log(entityManager.getRootEntities());

/**
 * Engine
 */
const ecsEngine = new ECSEngine(entityManager, componentManager);
ecsEngine.addSystem(new RenderSystem());

Engine.update = (deltaTime: number) => {
  Display.clear();
  ecsEngine.update(deltaTime);
};

Engine.start();

export default () => {};
