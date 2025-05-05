// src/ecs/World.ts

import { TransformComponent } from "./components";
import { ColorComponent } from "./components";
import { TransformStorage } from "./storage/TransformStorage";
import { VisibilityStorage } from "./storage/VisibilityStorage";
import { ColorStorage } from "./storage/ColorStorage";

/**
 * A numeric ID for each entity in the ECS.
 */
export type Entity = number;

/**
 * Constructor type used for component registration and queries.
 */
export type ComponentConstructor<T> = new (...args: any[]) => T;

/**
 * The central ECS World that manages entities and their components.
 * Now includes specialized TransformStorage for high-performance transform data.
 */
export class World {
  private nextEntity: Entity = 0;
  private freeEntities: Entity[] = [];
  private componentStores: Map<Function, Map<Entity, any>> = new Map();

  /**
   * Chunked, Struct-of-Arrays storage for all TransformComponents.
   */
  public readonly transformStorage = new TransformStorage();
  public readonly colorStorage = new ColorStorage(this.transformStorage);
  public readonly visibilityStorage = new VisibilityStorage(
    this.transformStorage
  );

  /**
   * Create a new entity ID, reusing freed IDs if available.
   */
  createEntity(): Entity {
    const entity =
      this.freeEntities.length > 0
        ? this.freeEntities.pop()! // reuse an ID
        : this.nextEntity++;
    return entity;
  }

  /**
   * Destroy an entity, recycling its ID and removing all its components.
   */
  destroyEntity(entity: Entity): void {
    // mark ID for reuse
    this.freeEntities.push(entity);
    // remove all components
    for (const store of this.componentStores.values()) {
      store.delete(entity);
    }
    // remove from transform storage if present
    this.transformStorage.remove(entity);
  }

  /**
   * Attach a component instance to an entity.
   * If it's a TransformComponent, also add to the specialized storage.
   */
  public addComponent<T>(entity: Entity, component: T): void {
    const ctor = (component as any).constructor;
    let store = this.componentStores.get(ctor) as Map<Entity, T>;
    if (!store) {
      store = new Map<Entity, T>();
      this.componentStores.set(ctor, store);
    }
    store.set(entity, component);

    if (component instanceof TransformComponent) {
      this.transformStorage.add(entity, component);
    }
    if (component instanceof ColorComponent) {
      this.colorStorage.add(entity, component);
    }
  }

  /**
   * Remove a component of the given type from an entity.
   * If it's a TransformComponent, remove from specialized storage.
   */
  public removeComponent<T>(
    entity: Entity,
    ctor: ComponentConstructor<T>
  ): void {
    this.componentStores.get(ctor)?.delete(entity);

    if (ctor === TransformComponent) {
      this.transformStorage.remove(entity);
    }
    if (ctor === ColorComponent) {
      this.colorStorage.remove(entity);
    }
  }

  /**
   * Get a component of the given type for an entity.
   */
  getComponent<T>(
    entity: Entity,
    ctor: ComponentConstructor<T>
  ): T | undefined {
    return this.componentStores.get(ctor)?.get(entity);
  }

  /**
   * Query all entities that have all of the specified component types.
   * Returns an array of matching entity IDs.
   */
  query(...ctors: ComponentConstructor<any>[]): Entity[] {
    if (ctors.length === 0) return [];
    const stores = ctors.map(
      (ctor) => this.componentStores.get(ctor) ?? new Map<Entity, any>()
    );
    // find smallest store to iterate
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
