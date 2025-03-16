import { Component } from "./Component";
import { Registry } from "./Bitmask";
import { Tree, TreeNode } from "../tools/Tree";

// Types for ECS
type EntityID = number;
type ComponentName = string;
type ComponentIndex = bigint;
type Entity = {
  id: EntityID;
  components: Component[];
};

// Tree Structure Assumptions:
// The implementation of tree operations (e.g., addNode, removeNode, moveNode) is assumed to be robust. Make sure that the Tree and TreeNode implementations correctly handle cases such as circular references or invalid moves.

// Potential Caching:
// If the same query (set of component names) is performed frequently, you might consider caching the result of getEntityBatch. However, ensure that the cache is invalidated when entities are added, removed, or updated.

// Concurrency and Mutability:
// While JavaScript’s single-threaded nature generally means you won’t run into race conditions, if this class is used in an environment with asynchronous updates or in a multi-threaded (e.g., WebWorker) context, you might need to consider adding synchronization or immutability safeguards.

// Potential Caching:
// If the same query (set of component names) is performed frequently, you might consider caching the result of getEntityBatch. However, ensure that the cache is invalidated when entities are added, removed, or updated.

/**
 * Central storage class for managing entities and their components using an Entity-Component-System (ECS) architecture.
 */
export class Storage {
  private static _nextEntityID: EntityID = 1;

  private _componentStorage: Map<ComponentIndex, Map<EntityID, Component>>;

  private _entityStorage: Map<EntityID, Set<ComponentIndex>>;

  private _entityTree: Tree<EntityID>;

  readonly type: string;

  constructor(type: string) {
    this._componentStorage = new Map();
    this._entityStorage = new Map();
    this._entityTree = new Tree<EntityID>(new TreeNode<EntityID>(0)); // The tree is initialized with a root node (entity id 0)
    this.type = type;
  }

  /**
   * Helper method to check if an entity exists.
   * @param id - The unique identifier of the entity.
   * @returns True if the entity exists; otherwise, false.
   */
  public entityExists(id: EntityID): boolean {
    return this._entityStorage.has(id);
  }

  /**
   * Creates a new entity with a unique ID and initializes its component set.
   * @returns A unique identifier for the newly created entity.
   */
  public createEntity(): EntityID {
    const id = Storage._nextEntityID++;
    // Create an empty set for the entity's components.
    this._entityStorage.set(id, new Set());
    // Immediately add the entity to the tree as a node (attached to the root by default).
    this._entityTree.addNode(new TreeNode<EntityID>(id));
    return id;
  }

  /**
   * Destroys an entity and removes all components associated with it.
   * It updates both the component storage and entity storage accordingly.
   * @param id - The unique identifier of the entity to be destroyed.
   */
  public destroyEntity(id: EntityID): void {
    // Throw an error if the entity does not exist.
    if (!this.entityExists(id)) {
      throw new Error(`Cannot destroy entity; entity ${id} does not exist.`);
    }

    // Update component storage.
    const entityComponents = this._entityStorage.get(id)!;
    for (const componentIndex of entityComponents) {
      const componentMap = this._componentStorage.get(componentIndex);
      if (componentMap) {
        componentMap.delete(id);
        if (componentMap.size === 0) {
          this._componentStorage.delete(componentIndex);
        }
      }
    }

    // Remove the entity from entity storage.
    this._entityStorage.delete(id);

    // Verify the existence of the corresponding tree node.
    const node = this._entityTree.getNodeByValue(id);
    if (!node) {
      // Option 1: Throw an error to enforce consistency.
      throw new Error(`Entity tree node for entity ${id} not found.`);

      // Option 2 (alternative): Log a warning and continue.
      // console.warn(`Entity tree node for entity ${id} not found.`);
    } else {
      // Remove the node from the tree.
      this._entityTree.removeNode(node);
    }
  }

  /**
   * Links an entity to a parent entity in the entity tree.
   * If the parent entity ID is 0, the entity is linked to the root node.
   * @param id - The entity id.
   * @param parent - The parent entity id.
   */
  public linkEntity(id: EntityID, parent: EntityID): void {
    const node = this._entityTree.getNodeByValue(id);
    if (!node) {
      throw new Error(`Cannot link entity; entity ${id} is not in the tree.`);
    }
    if (parent === 0) {
      const rootNode = this._entityTree.getNodeByValue(0);
      if (!rootNode) {
        throw new Error("Root node not found in the entity tree.");
      }
      this._entityTree.moveNode(node, rootNode);
    } else {
      const parentNode = this._entityTree.getNodeByValue(parent);
      if (!parentNode) {
        throw new Error(
          `Cannot link entity; parent entity ${parent} is not in the tree.`
        );
      }
      this._entityTree.moveNode(node, parentNode);
    }
  }

  /**
   * Unlinks an entity from its parent entity in the entity tree.
   * The entity is then linked to the root node (entity ID 0).
   * @param id - The entity id.
   */
  public unlinkEntity(id: EntityID): void {
    const node = this._entityTree.getNodeByValue(id);
    if (!node) {
      throw new Error(`Cannot unlink entity; entity ${id} is not in the tree.`);
    }
    const rootNode = this._entityTree.getNodeByValue(0);
    if (!rootNode) {
      throw new Error("Root node not found in the entity tree.");
    }
    this._entityTree.moveNode(node, rootNode);
  }

  /**
   * Checks if an entity exists in the storage
   * @param id - The unique identifier of the entity.
   * @returns True if the entity exists; otherwise, false.
   */
  public hasEntity(id: EntityID): boolean {
    return this._entityStorage.has(id);
  }

  /**
   * Adds a component to a specified entity and updates both the component storage and entity storage.
   * @param id - The unique identifier of the target entity.
   * @param component - The component instance to add.
   * @returns The updated storage instance (allows chaining).
   */
  public addEntityComponent(id: number, components: Component[]): Storage {
    if (!this.entityExists(id)) {
      throw new Error(`Cannot add component; entity ${id} does not exist.`);
    }

    for (const component of components) {
      const componentIndex = component.index;
      // Update component storage.
      let componentMap = this._componentStorage.get(componentIndex);
      if (componentMap) {
        componentMap.set(id, component);
      } else {
        this._componentStorage.set(componentIndex, new Map([[id, component]]));
      }
      // Update entity storage.
      const entityComponentSet = this._entityStorage.get(id)!; // Safe due to existence check.
      entityComponentSet.add(componentIndex);
    }

    return this;
  }

  /**
   * Removes a component from the given entity by its name.
   * Updates both the component storage and entity storage accordingly.
   * @param id - The unique identifier of the target entity.
   * @param componentName - The name of the component to be removed.
   * @returns The updated storage instance (allows chaining).
   */
  public removeEntityComponent(id: number, componentName: string): Storage {
    if (!this.entityExists(id)) {
      throw new Error(`Cannot remove component; entity ${id} does not exist.`);
    }

    try {
      const componentIndex = Registry.getIndex(componentName);
      // Update component storage.
      const componentMap = this._componentStorage.get(componentIndex);
      if (componentMap) {
        componentMap.delete(id);
        if (componentMap.size === 0) {
          this._componentStorage.delete(componentIndex);
        }
      }
      // Update entity storage.
      const entityComponentSet = this._entityStorage.get(id)!;
      entityComponentSet.delete(componentIndex);
      // Do not remove the entity from storage or tree even if it now has zero components.
      return this;
    } catch (error) {
      return this; // do nothing if the component does not exist in the Registry
    }
  }

  /**
   * Checks whether a given entity possesses a component identified by its name.
   * @param id - The unique identifier of the target entity.
   * @param componentName - The name of the component to check for.
   * @returns True if the entity has the component; otherwise, false.
   */
  public hasEntityComponent(
    id: EntityID,
    componentName: ComponentName
  ): boolean {
    try {
      const componentIndex = Registry.getIndex(componentName);
      const componentMap = this._componentStorage.get(componentIndex);
      return componentMap ? componentMap.has(id) : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieves a component of a specified type from an entity.
   * @template T - A type that extends Component.
   * @param id - The unique identifier of the target entity.
   * @param componentName - The name of the component to retrieve.
   * @returns The component of type T if found; otherwise, null.
   */
  public getEntityComponent<T extends Component>(
    id: EntityID,
    componentName: ComponentName
  ): T | null {
    try {
      const componentIndex = Registry.getIndex(componentName);
      const componentMap = this._componentStorage.get(componentIndex);
      return componentMap ? (componentMap.get(id) as T) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to retrieve a set of entity IDs that have a specified component.
   * @param componentName - The name of the component.
   * @returns A set containing all entity IDs that possess the component.
   */
  private _getEntitySet(componentName: ComponentName): Set<EntityID> {
    try {
      const componentIndex = Registry.getIndex(componentName);
      const componentMap = this._componentStorage.get(componentIndex);
      return componentMap ? new Set(componentMap.keys()) : new Set();
    } catch (error) {
      return new Set();
    }
  }

  /**
   * Helper method to calculate the intersection of two sets.
   * @template T
   * @param setA - The first set.
   * @param setB - The second set.
   * @returns A new set that is the intersection of setA and setB.
   */
  private static intersectSets<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const intersection = new Set<T>();
    for (const item of setA) {
      if (setB.has(item)) {
        intersection.add(item);
      }
    }
    return intersection;
  }

  /**
   * Retrieves all entities that have all the specified components.
   * If no component names are provided, it returns a union of all entities present in any component storage.
   * The entities that have any of the specified components in the exclude array are excluded.
   * @param componentNames - An array of component names to filter by. If not provided, returns all entities.
   * @param exclude - An array of component names to exclude from the results.
   * @returns A set of entity IDs that match the given criteria.
   */
  public getEntityBatch(
    componentNames: ComponentName[] = [],
    exclude: ComponentName[] = []
  ): EntityID[] {
    // If no component names are provided, return all entities.
    if (!componentNames || componentNames.length === 0) {
      return [...this._entityStorage.keys()];
    }

    // Start with entities that have all the specified components.
    const entitySets = componentNames.map((name) => this._getEntitySet(name));
    // Sort sets by size to optimize intersection.
    entitySets.sort((a, b) => a.size - b.size);
    let result = entitySets[0];
    for (let i = 1; i < entitySets.length; i++) {
      result = Storage.intersectSets(result, entitySets[i]);
    }

    // Remove entities that have any of the excluded components.
    for (const name of exclude) {
      const entitiesWithComponent = this._getEntitySet(name);
      for (const entity of entitiesWithComponent) {
        result.delete(entity);
      }
    }

    return [...result];
  }

  /**
   * Retrieves the entity tree node for a given entity ID.
   * @param id - The unique identifier of the entity.
   * @returns The tree node corresponding to the entity ID, or null if not found.
   */
  public getEntityNode(id: EntityID): TreeNode<EntityID> | null {
    return this._entityTree.getNodeByValue(id) || null;
  }

  /**
   * Outputs the current state of the component storage in a formatted JSON structure.
   * Useful for debugging purposes.
   */
  public prettyPrint(): void {
    const storageObject: Record<string, Record<string, any>> = {};
    for (const [componentIndex, componentMap] of this._componentStorage) {
      storageObject[componentIndex.toString()] = {};
      for (const [entityId, component] of componentMap) {
        storageObject[componentIndex.toString()][entityId] =
          component.constructor.name;
      }
    }
    console.log(JSON.stringify(storageObject, null, 2));
    this._entityTree.prettyPrint();
  }
}
