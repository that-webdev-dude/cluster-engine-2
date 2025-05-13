// // src/ecs/systems/CullingSystem.ts

// import { System } from "../System";
// import { World, Entity } from "../World";
// import { CameraComponent, VisibleComponent } from "../components";
// import { SpatialIndex, AABB } from "./../../tools/SpatialPartitioning";
// import { makeAABB } from "../utils";

// export class CullingSystem implements System {
//   constructor(private world: World, private grid: SpatialIndex<Entity>) {}

//   update() {
//     // 1) get camera AABB
//     const camId = this.world.query(CameraComponent)[0]!;
//     const cam = this.world.getComponent(camId, CameraComponent)!;
//     const camAABB: AABB = {
//       minX: cam.x,
//       minY: cam.y,
//       maxX: cam.x + cam.width,
//       maxY: cam.y + cam.height,
//     };

//     // 2) clear all previous Visible tags
//     this.world.visibilityStorage.clear();

//     // 3) query only the cells overlapping the camera
//     const candidates = this.grid.queryRegion(camAABB);

//     for (const e of candidates) {
//       const loc = this.world.transformStorage.getLocation(e);
//       if (!loc) continue;
//       const ts = this.world.transformStorage.getChunk(loc.chunk)!;
//       const index = loc.index;

//       const px = ts.positions[2 * index];
//       const py = ts.positions[2 * index + 1];
//       const sx = ts.scales[2 * index];
//       const sy = ts.scales[2 * index + 1];
//       const rot = ts.rotations[index];

//       const box = makeAABB([px, py], [sx, sy], rot);

//       // test intersection
//       if (
//         box.maxX >= camAABB.minX &&
//         box.minX <= camAABB.maxX &&
//         box.maxY >= camAABB.minY &&
//         box.minY <= camAABB.maxY
//       ) {
//         // **instead** of world.addComponent(e, VisibleComponent):
//         this.world.visibilityStorage.setVisible(e);
//       }
//     }
//   }
// }
