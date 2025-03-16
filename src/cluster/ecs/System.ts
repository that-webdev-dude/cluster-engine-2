import { Bitmask } from "./Bitmask";
import { Storage } from "./Storage";

type ComponentType = string;

/**
 * A system is a collection of logic that operates on entities with a specific
 * set of components. Systems are responsible for updating the state of entities
 * over time.
 * The mask property is a bitmask that represents the components that an entity
 * must have in order to be processed by the system.
 */
export abstract class System {
  readonly mask: bigint;
  readonly name: string;

  constructor(required: ComponentType[] = []) {
    this.mask = required.length ? Bitmask.typesToMask(required) : BigInt(0);
    this.name = this.constructor.name;
  }

  public abstract update(entity: Storage, dt: number, t: number): void;
}
