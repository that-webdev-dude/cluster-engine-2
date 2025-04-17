import { EntityManager } from "./EntityManager";
import { Component, ComponentType, MAX_COMPONENTS } from "./Component";

// v01.0.0
export class ComponentManager {
  private componentStores = new Map<ComponentType, Map<number, Component>>();
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  registerComponent(type: ComponentType): void {
    if (!this.componentStores.has(type)) {
      this.componentStores.set(type, new Map());
    }
  }

  addComponent(
    entity: number,
    type: ComponentType,
    component: Component
  ): void {
    this.componentStores.get(type)?.set(entity, component);

    const oldMask = this.entityManager.getMask(entity);
    const newMask = oldMask | type;

    if (BigInt(newMask) >= 1n << BigInt(MAX_COMPONENTS)) {
      throw new Error("Maximum number of components exceeded.");
    }

    if (oldMask !== newMask) {
      this.entityManager.update(entity, newMask);
    }
  }

  removeComponent(entity: number, type: ComponentType): void {
    this.componentStores.get(type)?.delete(entity);

    const oldMask = this.entityManager.getMask(entity);
    const newMask = oldMask & ~type;

    if (oldMask !== newMask) {
      this.entityManager.update(entity, newMask);
    }
  }

  getComponent<T extends Component>(
    entity: number,
    type: ComponentType
  ): T | undefined {
    return this.componentStores.get(type)?.get(entity) as T;
  }
}

// // v01.0.1
// // Define a schema for a component type.
// export interface ComponentSchema {
//   numericFields: string[]; // e.g., ['x', 'y'] for a Position component
//   nonNumericFields?: string[]; // e.g., ['flag'] for a Flag component (string)
// }

// // A ComponentStore holds the data arrays for a component type.
// export interface ComponentStore {
//   [field: string]: Float32Array | any[]; // Numeric fields use Float32Array; others use any[]
// }

// // The ComponentManager maintains a map of component stores, keyed by numeric component IDs.
// export class ComponentManager_v01_0_1 {
//   // Map from component id (a number) to its store, schema, and current capacity.
//   private componentStores: Map<
//     number,
//     { store: ComponentStore; schema: ComponentSchema; capacity: number }
//   > = new Map();
//   private entityManager: EntityManager;

//   constructor(entityManager: EntityManager) {
//     this.entityManager = entityManager;
//   }

//   /**
//    * Registers a new component type.
//    * @param componentId A unique numeric identifier for the component.
//    * @param schema The component schema describing numeric and non‑numeric fields.
//    * @param initialCapacity The initial capacity for the store (default: 1024).
//    */
//   registerComponent(
//     componentId: number,
//     schema: ComponentSchema,
//     initialCapacity: number = 16384
//   ): void {
//     if (this.componentStores.has(componentId)) {
//       throw new Error(`Component type ${componentId} is already registered.`);
//     }

//     // Create the store according to the schema.
//     const store: ComponentStore = {};
//     // Create typed arrays for numeric fields.
//     for (const field of schema.numericFields) {
//       store[field] = new Float32Array(initialCapacity);
//     }
//     // Create regular arrays for non‑numeric fields.
//     if (schema.nonNumericFields) {
//       for (const field of schema.nonNumericFields) {
//         store[field] = new Array(initialCapacity);
//       }
//     }

//     this.componentStores.set(componentId, {
//       store,
//       schema,
//       capacity: initialCapacity,
//     });
//   }

//   /**
//    * Retrieves the component store for a given component type.
//    * @param componentId The numeric identifier of the component type.
//    */
//   getComponentStore(componentId: number): ComponentStore {
//     const comp = this.componentStores.get(componentId);
//     if (!comp) {
//       throw new Error(`Component type ${componentId} is not registered.`);
//     }
//     return comp.store;
//   }

//   /**
//    * Adds or updates a component instance for a given entity.
//    * Assumes the entityId corresponds to an index in the store.
//    * @param componentId The numeric component type identifier.
//    * @param entityId The entity's id (also used as index in the store).
//    * @param data An object containing field values for the component.
//    */
//   addComponent(
//     type: number,
//     entity: number,
//     data: { [field: string]: any }
//   ): void {
//     const compInfo = this.componentStores.get(type);
//     if (!compInfo) {
//       throw new Error(`Component type ${type} is not registered.`);
//     }
//     const { store, schema, capacity } = compInfo;
//     if (entity >= capacity) {
//       // For simplicity, we're not implementing capacity growth here.
//       throw new Error(
//         `Entity id ${entity} exceeds current capacity ${capacity} for component ${type}.`
//       );
//     }

//     // Write data into the numeric arrays.
//     for (const field of schema.numericFields) {
//       if (typeof data[field] !== "number") {
//         throw new Error(`Field "${field}" must be a number.`);
//       }
//       (store[field] as Float32Array)[entity] = data[field];
//     }
//     // Write data into non‑numeric arrays.
//     if (schema.nonNumericFields) {
//       for (const field of schema.nonNumericFields) {
//         store[field][entity] = data[field];
//       }
//     }

//     const oldMask = this.entityManager.getMask(entity);
//     const newMask = oldMask | type;

//     if (BigInt(newMask) >= 1n << BigInt(MAX_COMPONENTS)) {
//       throw new Error("Maximum number of components exceeded.");
//     }

//     if (oldMask !== newMask) {
//       this.entityManager.update(entity, newMask);
//     }
//   }

//   /**
//    * Removes a component instance for a given entity.
//    * @param componentId The numeric component type identifier.
//    * @param entityId The entity's id (used as index in the store).
//    */
//   removeComponent(type: number, entity: number): void {
//     const compInfo = this.componentStores.get(type);
//     if (!compInfo) {
//       throw new Error(`Component type ${type} is not registered.`);
//     }
//     const { store, schema } = compInfo;

//     // Reset each numeric field to 0 (or you could choose a different default).
//     for (const field of schema.numericFields) {
//       (store[field] as Float32Array)[entity] = 0;
//     }
//     // Reset each non-numeric field to undefined (or null, or another default).
//     if (schema.nonNumericFields) {
//       for (const field of schema.nonNumericFields) {
//         store[field][entity] = undefined;
//       }
//     }

//     const oldMask = this.entityManager.getMask(entity);
//     const newMask = oldMask & ~type;

//     if (oldMask !== newMask) {
//       this.entityManager.update(entity, newMask);
//     }
//   }

//   /**
//    * Constructs a view (or group) of component data for a set of entities.
//    * This view is built on demand by copying the relevant data for each component type.
//    * @param componentIds An array of numeric component type identifiers to include in the view.
//    * @param entityIds An array of entity ids that own those components.
//    * @returns An object mapping each component id to its view data.
//    */
//   getView(
//     componentIds: number[],
//     entityIds: number[]
//   ): {
//     [componentId: number]: { [field: string]: Float32Array | any[] };
//   } {
//     const view: {
//       [componentId: number]: { [field: string]: Float32Array | any[] };
//     } = {};

//     // Process each requested component type.
//     for (const componentId of componentIds) {
//       const compInfo = this.componentStores.get(componentId);
//       if (!compInfo) {
//         throw new Error(`Component type ${componentId} is not registered.`);
//       }
//       const { store, schema } = compInfo;
//       const length = entityIds.length;
//       // Create new arrays for the view for each field.
//       const componentView: { [field: string]: Float32Array | any[] } = {};

//       for (const field of schema.numericFields) {
//         // Allocate a new typed array to hold a compact copy of the numeric data.
//         componentView[field] = new Float32Array(length);
//       }
//       if (schema.nonNumericFields) {
//         for (const field of schema.nonNumericFields) {
//           componentView[field] = new Array(length);
//         }
//       }
//       // Copy the data from the component store into the view.
//       for (let i = 0; i < length; i++) {
//         const entityId = entityIds[i];
//         for (const field of schema.numericFields) {
//           (componentView[field] as Float32Array)[i] = (
//             store[field] as Float32Array
//           )[entityId];
//         }
//         if (schema.nonNumericFields) {
//           for (const field of schema.nonNumericFields) {
//             componentView[field][i] = store[field][entityId];
//           }
//         }
//       }
//       view[componentId] = componentView;
//     }

//     return view;
//   }
// }
