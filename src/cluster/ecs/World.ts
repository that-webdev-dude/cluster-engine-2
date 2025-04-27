// src/ecs/World.ts

// A numeric ID for each entity
export type Entity = number;

// Component constructor type for registering and querying stores
export type ComponentConstructor<T> = new (...args: any[]) => T;

export class World {
  private nextEntity: Entity = 0;
  private freeEntities: Entity[] = [];
  private componentStores: Map<Function, Map<Entity, any>> = new Map();

  /** Create a new entity or recycle a freed one */
  createEntity(): Entity {
    const entity =
      this.freeEntities.length > 0
        ? this.freeEntities.pop()! // reuse
        : this.nextEntity++;
    return entity;
  }

  /** Destroy an entity and remove all its components */
  destroyEntity(entity: Entity): void {
    // mark ID for reuse
    this.freeEntities.push(entity);
    // remove any stored components
    for (const store of this.componentStores.values()) {
      store.delete(entity);
    }
  }

  /** Attach a component instance to an entity */
  addComponent<T>(entity: Entity, component: T): void {
    const ctor = (component as any).constructor;
    let store = this.componentStores.get(ctor) as Map<Entity, T>;
    if (!store) {
      store = new Map<Entity, T>();
      this.componentStores.set(ctor, store);
    }
    store.set(entity, component);
  }

  /** Remove a component of the given type from an entity */
  removeComponent<T>(entity: Entity, ctor: ComponentConstructor<T>): void {
    this.componentStores.get(ctor)?.delete(entity);
  }

  /** Get a component of the given type for an entity */
  getComponent<T>(
    entity: Entity,
    ctor: ComponentConstructor<T>
  ): T | undefined {
    return this.componentStores.get(ctor)?.get(entity);
  }

  /**
   * Query all entities that have all of the specified component types
   * Returns an array of matching Entity IDs
   */
  query(...ctors: ComponentConstructor<any>[]): Entity[] {
    if (ctors.length === 0) {
      return [];
    }
    const stores = ctors.map(
      (ctor) => this.componentStores.get(ctor) ?? new Map()
    );
    // Start with the smallest set for efficiency
    const smallest = stores.reduce((a, b) => (a.size < b.size ? a : b));
    const result: Entity[] = [];
    for (const e of smallest.keys()) {
      if (stores.every((s) => s.has(e))) {
        result.push(e);
      }
    }
    return result;
  }
}
