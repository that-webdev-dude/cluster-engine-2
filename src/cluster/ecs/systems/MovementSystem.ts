// src/ecs/systems/MovementSystem.ts
import { System } from "../System";
import { World } from "../World";
import { TransformComponent } from "../components";
import { SpatialIndex } from "../../tools/SpatialPartitioning";

export class MovementSystem implements System {
  constructor(private world: World, private grid: SpatialIndex<number>) {}

  update(delta: number) {
    // simple demo: rotate every entity 90° per second
    const ents = this.world.query(TransformComponent);
    for (const e of ents) {
      const t = this.world.getComponent(e, TransformComponent)!;
      // t.rotation += Math.PI * 0.5 * delta;

      // // update the grid with the new position and size
      // this.grid.update(e, {
      //   minX: t.position[0],
      //   minY: t.position[1],
      //   maxX: t.position[0] + t.scale[0],
      //   maxY: t.position[1] + t.scale[1],
      // });
    }
  }
}
