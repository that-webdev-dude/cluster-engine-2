import { EntityManager } from "./EntityManager";
import { ComponentManager } from "./ComponentManager";
import { SystemManager } from "./SystemManager";
import { Entity } from "./Entity";
import { Component, ComponentType, getMask } from "./Component";
import { System } from "./System";

export class World {
  readonly entities: EntityManager;
  readonly components: ComponentManager;
  readonly systems: SystemManager;

  constructor() {
    this.entities = new EntityManager();
    this.components = new ComponentManager(this.entities);
    this.systems = new SystemManager();
  }

  // entity methods
  createEntity(): Entity {
    return this.entities.create();
  }

  destroyEntity(entity: Entity): void {
    // Optionally remove components here
    this.entities.destroy(entity);
  }

  getEntites(types: ComponentType[]): Entity[] {
    return this.entities.query(getMask(types));
  }

  // component methods
  registerComponent(type: ComponentType): void {
    this.components.registerComponent(type);
  }

  addComponent(
    entity: Entity,
    type: ComponentType,
    component: Component
  ): void {
    this.components.addComponent(entity, type, component);
  }

  removeComponent(entity: Entity, type: ComponentType): void {
    this.components.removeComponent(entity, type);
  }

  getComponent<T extends Component>(
    entity: Entity,
    type: ComponentType
  ): T | undefined {
    return this.components.getComponent(entity, type);
  }

  // system methods
  addSystem(system: System): void {
    this.systems.addSystem(system, this);
  }

  update(delta: number): void {
    this.systems.updateSystems(delta);
    this.entities.lazyCleanup(); // Cleanup recycled entities
  }
}

// export class World {
//   readonly entities: EntityManager;
//   readonly components: ComponentManager;
//   readonly systems: SystemManager;

//   constructor() {
//     this.entities = new EntityManager();
//     this.components = new ComponentManager(this.entities);
//     this.systems = new SystemManager();
//   }

//   // entity methods
//   createEntity(): Entity {
//     return this.entities.create();
//   }

//   destroyEntity(entity: Entity): void {
//     // Optionally remove components here
//     this.entities.destroy(entity);
//   }

//   getEntites(types: ComponentType[]): Entity[] {
//     return this.entities.query(getMask(types));
//   }

//   // component methods
//   registerComponent(type: ComponentType): void {
//     this.components.registerComponent(type);
//     // this.components.registerComponent(type, schema);
//   }

//   addComponent(
//     entity: Entity,
//     type: ComponentType,
//     component: Component
//   ): void {
//     // this.components.addComponent(entity, type, component);
//     this.components.addComponent(type, entity, component);
//   }

//   removeComponent(entity: Entity, type: ComponentType): void {
//     // this.components.removeComponent(entity, type);
//     this.components.removeComponent(type, entity);
//   }

//   getComponent<T extends Component>(
//     entity: Entity,
//     type: ComponentType
//   ): T | undefined {
//     return this.components.getComponent(entity, type);
//   }

//   // system methods
//   addSystem(system: System): void {
//     this.systems.addSystem(system, this);
//   }

//   update(delta: number): void {
//     this.systems.updateSystems(delta);
//     this.entities.cleanup(); // Cleanup recycled entities
//   }

//   // getView(
//   //   componentTypes: ComponentType[],
//   //   entities: Entity[]
//   // ): {
//   //   [componentId: number]: { [field: string]: Float32Array | any[] };
//   // } {
//   //   return this.components.getView(componentTypes, entities);
//   // }
// }
