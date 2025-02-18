import { UUID } from "../tools/UUID";
import { Bitmask } from "./Bitmask";
import { Component, ComponentMap } from "./Component";

type EntityId = string;

type EntityType = string;

/**
 * The Entity class is used to represent an entity in an ECS. It contains a
 * unique ID, a type, a parent entity, a map of child entities, and a map of
 * components. The Entity class provides methods for adding, removing, and
 * retrieving components, as well as adding, removing, and retrieving child
 * entities.
 */
export class Entity {
  private _id: string;

  private _type: string;

  private _parent: Entity | null;

  private _children: EntityMap;

  private _components: ComponentMap;

  private _batch: Set<Entity> = new Set();

  private _mask: Bitmask = new Bitmask();

  public active: boolean = true;

  public dead: boolean = false;

  constructor(type: string) {
    this._id = UUID.generate();
    this._type = type;
    this._parent = null;
    this._children = new EntityMap();
    this._components = new ComponentMap();
  }

  get id(): EntityId {
    return this._id;
  }

  get type(): EntityType {
    return this._type;
  }

  get mask(): bigint {
    return this._mask
      .clear()
      .addMask(this._components.mask)
      .addMask(this._children.mask).value;
  }

  get parent(): Entity | null {
    return this._parent;
  }

  // component methods
  addComponent(component: Component): Entity {
    this._components.add(component);
    return this;
  }

  removeComponent(type: string): Entity {
    this._components.remove(type);
    return this;
  }

  clearComponents(): Entity {
    this._components.clear();
    return this;
  }

  getComponent<T>(type: string): T | undefined {
    return this._components.find<T>(type);
  }

  // child entity methods
  addChild(entity: Entity): Entity {
    if (entity.parent) {
      throw new Error(`Entity ${entity.type} already has a parent`);
    }

    // an entity with no parent, is a root entity
    entity._parent = this;
    this._children.add(entity);

    return this;
  }

  removeChild(id: EntityId): Entity {
    const entity = this._children.get(id);
    if (entity) {
      entity._parent = null;
      this._children.remove(id);
    }

    return this;
  }

  clearChildren(): Entity {
    this._children.clear();
    return this;
  }

  forEach(callback: (value: Entity, key: EntityId) => void) {
    this._children.forEach(callback);
  }

  // utilty methods
  getComponentList(): string[] {
    return [...this._components.keys()];
  }

  getChildList(): string[] {
    return [...this._children.types()];
  }

  hasMask(mask: bigint, deepSearch: boolean = false): boolean {
    if (this.mask & mask) return true;

    if (deepSearch) {
      for (const entity of this._children.values()) {
        if (entity.hasMask(mask, deepSearch)) return true;
      }
    }

    return false;
  }

  getBatch(mask: bigint): Set<Entity> {
    // batch select all the entities that match the mask down the tree. is a recursive function
    function getBatchRecursive(
      entity: Entity,
      batch: Set<Entity>,
      mask: bigint
    ) {
      if ((entity._components.mask & mask) === mask) {
        batch.add(entity);
      }

      entity.forEach((child) => {
        getBatchRecursive(child, batch, mask);
      });
    }

    this._batch.clear(); // cached batch is cleared before each call

    getBatchRecursive(this, this._batch, mask);

    return this._batch;
  }

  prettyPrint(): string {
    function prettyPrintRecursive(entity: Entity): any {
      return {
        type: entity._type,
        parent: entity._parent?._type || null,
        mask: Bitmask.maskToTypes(entity.mask),
        components: [...entity._components.keys()],
        children: [...entity._children.values()].map(prettyPrintRecursive),
      };
    }

    return JSON.stringify(prettyPrintRecursive(this), null, 2);
  }
}

/**
 * The EntityMap class is used to store a map of entities. It provides methods
 * for adding, removing, and retrieving entities from the map.
 */
export class EntityMap {
  private _entities: Map<EntityId, Entity> = new Map();

  private _mask: Bitmask = new Bitmask();

  get mask(): bigint {
    this._mask.clear();
    for (const entity of this._entities.values()) {
      this._mask.addMask(entity.mask);
    }
    return this._mask.value;
  }

  get size(): number {
    return this._entities.size;
  }

  get length(): number {
    return this._entities.size;
  } // Alias for size

  add(entity: Entity): EntityMap {
    this._entities.set(entity.id, entity);
    return this;
  }

  push(entity: Entity): EntityMap {
    return this.add(entity);
  } // Alias for add

  remove(id: EntityId): EntityMap {
    this._entities.delete(id);
    return this;
  }

  get(id: EntityId): Entity | undefined {
    return this._entities.get(id);
  }

  has(id: EntityId): boolean {
    return this._entities.has(id);
  }

  clear(): EntityMap {
    this._entities.clear();
    return this;
  }

  [Symbol.iterator]() {
    return this._entities.values();
  }

  forEach(callback: (value: Entity, key: EntityId) => void) {
    this._entities.forEach(callback);
  }

  values(): IterableIterator<Entity> {
    return this._entities.values();
  }

  keys(): IterableIterator<EntityId> {
    return this._entities.keys();
  }

  ids(): EntityId[] {
    return [...this._entities.keys()];
  }

  types(): EntityType[] {
    return [...this._entities.values()].map((entity) => entity.type);
  }
}

// // USAGE:
// console.log("Usage - Entity.ts");
// console.log("");

// class Position extends Component {
//   x: number = 0;
//   y: number = 0;
// }

// class Velocity extends Component {
//   x: number = 0;
//   y: number = 0;
// }

// class Dummy extends Component {}

// const child31 = new Entity("child31");

// const child32 = new Entity("child32");

// const child33 = new Entity("child33");

// const child34 = new Entity("child34");

// const child35 = new Entity("child35");

// const child351 = new Entity("child351");

// const child352 = new Entity("child352");

// const child1 = new Entity("child1");

// const child2 = new Entity("child2");

// const child3 = new Entity("child3");

// const main = new Entity("main")
//   .addChild(child1)
//   .addChild(child2)
//   .addChild(child3);

// // console.log("Root entity: ", main.prettyPrint());

// child3
//   .addChild(child31)
//   .addChild(child32)
//   .addChild(child33)
//   .addChild(child34)
//   .addChild(child35);

// // child35.addChild(child351).addChild(child352);

// // console.log("Root entity: ", main.prettyPrint());

// child3.addComponent(new Position());

// child31.addComponent(new Velocity());

// console.log("Root entity: ", main.prettyPrint());

// const update = (entity: Entity) => {
//   // process only the entities with Position and Velocity components
//   if (
//     entity.mask & Bitmask.typesToMask(["Position"]) &&
//     entity.mask & Bitmask.typesToMask(["Velocity"])
//   ) {
//     console.log(`Entity ${entity.type} has Position and Velocity components`);
//   }

//   entity.forEach((child) => {
//     update(child);
//   });
// };

// update(main);
