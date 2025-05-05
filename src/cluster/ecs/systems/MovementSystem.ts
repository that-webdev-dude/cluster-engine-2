// src/ecs/systems/MovementSystem.ts
import { System } from "../System";
import { World } from "../World";
import { TransformComponent } from "../components";
import { SpatialIndex } from "../../tools/SpatialPartitioning";

export class MovementSystem implements System {
  constructor(private world: World, private grid: SpatialIndex<number>) {}

  update(delta: number) {
    this.world.transformStorage.forEachChunk(
      (_p, _s, rot, _pp, _ps, _pr, ents, len) => {
        for (let i = 0; i < len; i++) {
          rot[i] += Math.PI * 0.5 * delta;
        }
      }
    );

    // make sure whenever you move or scale an entity (in MovementSystem) you also call grid.update(e, makeAABB(...)). Otherwise queryRegion will return stale cells.
  }
}
