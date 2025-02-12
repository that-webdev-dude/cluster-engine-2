import { Bitmask } from "./Bitmask";
import { Entity } from "./Entity";

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

  constructor(required: ComponentType[] = []) {
    this.mask = Bitmask.typesToMask(required);
  }

  public abstract update(entity: Entity, dt: number, t: number): void;
}
