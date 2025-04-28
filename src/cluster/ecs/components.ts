// src/ecs/components.ts

/**
 * A component that holds an entity's transform in 2D space.
 * position: [x, y]
 * scale:    [sx, sy]
 * rotation: in radians
 */
export class TransformComponent {
  constructor(
    public position: [number, number] = [0, 0],
    public scale: [number, number] = [1, 1],
    public rotation: number = 0
  ) {}
}

/**
 * A component that holds an RGBA color for an entity.
 */
export class ColorComponent {
  constructor(public color: [number, number, number, number] = [1, 1, 1, 1]) {}
}
