// src/ecs/systems/CullingSystem.ts
// import { System } from "../System";
// import { World } from "../World";
// import {
//   TransformComponent,
//   CameraComponent,
//   VisibleComponent,
// } from "../components";
// import { SpatialIndex } from "../../tools/SpatialPartitioning";

// export class CullingSystem implements System {
//   constructor(private world: World, private grid: SpatialIndex<number>) {}

//   update(delta: number) {
//     const cameraId = this.world.query(CameraComponent)[0]!;
//     const camera = this.world.getComponent(cameraId, CameraComponent)!;

//     // For simplicity, assume our quad’s AABB is [pos.x, pos.x + scale.x] etc.
//     // const hits = this.world.query(TransformComponent);
//     const hits = this.grid.queryRegion({
//       minX: camera.x,
//       minY: camera.y,
//       maxX: camera.x + camera.width,
//       maxY: camera.y + camera.height,
//     });
//     for (const e of hits) {
//       const t = this.world.getComponent(e, TransformComponent)!;
//       const halfW = t.scale[0];
//       const halfH = t.scale[1];
//       const xMin = t.position[0] - halfW;
//       const xMax = t.position[0] + halfW;
//       const yMin = t.position[1] - halfH;
//       const yMax = t.position[1] + halfH;

//       const visible =
//         xMax >= camera.x &&
//         xMin <= camera.x + camera.width &&
//         yMax >= camera.y &&
//         yMin <= camera.y + camera.height;

//       const hasTag = !!this.world.getComponent(e, VisibleComponent);
//       if (visible && !hasTag) {
//         this.world.addComponent(e, new VisibleComponent());
//       } else if (!visible && hasTag) {
//         this.world.removeComponent(e, VisibleComponent);
//       }
//     }
//   }
// }

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
