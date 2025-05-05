// src/ecs/systems/CullingSystem.ts

import { System } from "../System";
import { World, Entity } from "../World";
import { CameraComponent, VisibleComponent } from "../components";
import { SpatialIndex, AABB } from "./../../tools/SpatialPartitioning";
import { makeAABB } from "../utils";

export class CullingSystem implements System {
  constructor(private world: World, private grid: SpatialIndex<Entity>) {}

  update() {
    // 1) get camera AABB
    const camId = this.world.query(CameraComponent)[0]!;
    const cam = this.world.getComponent(camId, CameraComponent)!;
    const camAABB: AABB = {
      minX: cam.x,
      minY: cam.y,
      maxX: cam.x + cam.width,
      maxY: cam.y + cam.height,
    };

    // 2) clear all previous Visible tags
    for (const e of this.world.query(VisibleComponent)) {
      this.world.removeComponent(e, VisibleComponent);
    }

    // 3) query only the cells overlapping the camera
    const candidates = this.grid.queryRegion(camAABB);

    // 4) for each candidate, you could do a precise AABB-vs-AABB if you like
    for (const e of candidates) {
      // optional fine-grained test:
      // const box = makeAABB(this.world.getComponent(e, TransformComponent)!);
      // if (!overlaps(box, camAABB)) continue;
      this.world.addComponent(e, new VisibleComponent());
    }
  }
}
