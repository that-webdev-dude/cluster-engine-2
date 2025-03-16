import { Vector } from "./Vector";

export class Physics {
  static applyForce(acceleration: Vector, force: { x: number; y: number }) {
    acceleration.x += force.x;
    acceleration.y += force.y;
    return acceleration;
  }

  static applyGravity(acceleration: Vector, gravity: number) {
    Physics.applyForce(acceleration, { x: 0, y: gravity });
    return acceleration;
  }

  static applyFriction(
    acceleration: Vector,
    velocity: Vector,
    friction: number
  ) {
    Physics.applyForce(acceleration, {
      x: -1 * friction * velocity.x,
      y: -1 * friction * velocity.y,
    });
    return acceleration;
  }

  static applyImpulse(
    acceleration: Vector,
    impulse: { x: number; y: number },
    dt: number
  ) {
    Physics.applyForce(acceleration, {
      x: impulse.x / dt,
      y: impulse.y / dt,
    });
    return acceleration;
  }
}
