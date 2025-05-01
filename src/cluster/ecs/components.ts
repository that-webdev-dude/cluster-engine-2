// src/ecs/components.ts

/**
 * A component that holds an entity's transform in 2D space.
 * position: [x, y]
 * scale:    [sx, sy]
 * rotation: in radians
 */
export class TransformComponent {
  // current
  public position: [number, number];
  public scale: [number, number];
  public rotation: number;

  // previous
  public prevPosition: [number, number];
  public prevScale: [number, number];
  public prevRotation: number;

  constructor(
    position: [number, number] = [0, 0],
    scale: [number, number] = [1, 1],
    rotation: number = 0
  ) {
    this.position = [...position];
    this.scale = [...scale];
    this.rotation = rotation;

    // start prev = curr
    this.prevPosition = [...position];
    this.prevScale = [...scale];
    this.prevRotation = rotation;
  }
}

/**
 * A component that holds an RGBA color for an entity.
 */
export class ColorComponent {
  constructor(public color: [number, number, number, number] = [1, 1, 1, 1]) {}
}

/**
 * A component that holds the camera's viewport in 2D space.
 * Lower left corner in world coordinates.
 */
export class CameraComponent {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0,
    public zoom: number = 0
  ) {}
}

/**
 * A "visible" component that can be used to mark entities that should be rendered.
 */
export class VisibleComponent {}
