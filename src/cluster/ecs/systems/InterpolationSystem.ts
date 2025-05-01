// src/ecs/systems/InterpolationSystem.ts
import { System } from "../System";
import { World } from "../World";
import { TransformComponent } from "../components";

export class InterpolationSystem implements System {
  constructor(private world: World) {}

  update(delta: number) {
    // snapshot every entity’s current→previous
    const ents = this.world.query(TransformComponent);
    for (const e of ents) {
      const t = this.world.getComponent(e, TransformComponent)!;
      t.prevPosition = [...t.position];
      t.prevScale = [...t.scale];
      t.prevRotation = t.rotation;
    }
  }
}
