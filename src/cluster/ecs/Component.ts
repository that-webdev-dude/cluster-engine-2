import { Bitmask } from "./Bitmask";
import { Registry } from "./Bitmask";

type ComponentType = string;

/**
 * The Component class is an abstract base class that represents a component
 * that can be added to an entity. It provides a type property that is used to
 * identify the component type. The type property is automatically registered
 * with the Registry class when a new component is created. The index property
 * is used to store the index of the component type in the registry.
 */
export abstract class Component {
  readonly type: string;

  constructor() {
    this.type = Registry.register(new.target.name);
  }

  get index(): bigint {
    return Registry.indexOf(this.type);
  }
}

/**
 * The ComponentMap class is used to store a map of components that an entity has.
 * It provides methods for adding, removing, and finding components in the map.
 * It also provides a mask property that represents the components that the entity has.
 * The mask is used to quickly check if an entity has a specific component type.
 */
export class ComponentMap {
  private _components: Map<string, Component> = new Map();

  private _mask: Bitmask = new Bitmask();

  add(component: Component): ComponentMap {
    this._components.set(component.type, component);
    this._mask.set(component.type);
    return this;
  }

  push(component: Component): ComponentMap {
    return this.add(component);
  } // Alias for add

  remove(componentType: ComponentType): ComponentMap {
    this._components.delete(componentType);
    this._mask.delete(componentType);
    return this;
  }

  find<T>(componentType: ComponentType): T | undefined {
    return this._components.get(componentType) as T;
  }

  get<T>(component: Component): T | undefined {
    return this.find<T>(component.type);
  } // Alias for find

  has(component: Component): boolean {
    return this._components.has(component.type);
  }

  hasType(componentType: ComponentType): boolean {
    return this._components.has(componentType);
  }

  includesComponent(component: Component): boolean {
    return this.has(component);
  } // Alias for has

  includesType(componentType: ComponentType): boolean {
    return this.hasType(componentType);
  } // Alias for hasType

  clear(): ComponentMap {
    this._components.clear();
    this._mask.clear();
    return this;
  }

  get size(): number {
    return this._components.size;
  }

  get length(): number {
    return this._components.size;
  } // Alias for size

  get mask(): bigint {
    return this._mask.value;
  }

  get previousMask(): bigint {
    return this._mask.previous;
  }

  [Symbol.iterator]() {
    return this._components.values();
  }

  forEach(callback: (value: Component, key: string) => void) {
    this._components.forEach(callback);
  }

  values(): IterableIterator<Component> {
    return this._components.values();
  }

  keys(): IterableIterator<string> {
    return this._components.keys();
  }
}
