export type Component = Record<string, unknown>;

// Numeric component type identifiers for performance
export enum ComponentType {
  TRANSFORM = 1 << 0, // 00001
  VELOCITY = 1 << 1, // 00010
  COLLIDER = 1 << 2, // 00100
  SPRITE = 1 << 3, // 01000
  INPUT = 1 << 4, // 10000
  // // Add new components here...
}

export interface ComponentSchema {
  numericFields: string[]; // e.g., ['x', 'y'] for a Position component
  nonNumericFields?: string[]; // e.g., ['flag'] for a Flag component (string)
}

// Maximum number of components supported. considering 32-bit integers, we can have up to 32 components.
// if you need more, consider using a larger integer type or a different approach.
export const MAX_COMPONENTS = 32;

// // Convert an array of component types into a bitmask.
export function getMask(componentTypes: ComponentType[]): number {
  let mask = 0;
  for (const type of componentTypes) {
    mask |= type;
  }
  return mask >>> 0; // Convert to unsigned 32-bit integer
}
