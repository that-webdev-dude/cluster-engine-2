// src/ecs/systems/MovementSystem.ts
import { System } from "../System";
import { World } from "../World";
import { TransformComponent } from "../components";

export class MovementSystem implements System {
  constructor(private world: World) {}

  update(delta: number) {
    // simple demo: rotate every entity 90° per second
    const ents = this.world.query(TransformComponent);
    for (const e of ents) {
      const t = this.world.getComponent(e, TransformComponent)!;
      t.rotation += Math.PI * 0.5 * delta;
    }
  }
}
