// // src/ecs/utils/createTilemap.ts

// import { World } from "../World";
// import { TransformComponent, ColorComponent } from "../components";
// import { AABB } from "../../tools/SpatialPartitioning";
// import { config } from "../../config";

// /**
//  * Fills the world with a checkerboard of tile‐entities.
//  * @param world      your ECS world
//  * @param mapW       total map width in pixels (e.g. 1280)
//  * @param mapH       total map height in pixels (e.g. 768)
//  * @param tileSize   size of each tile in pixels (e.g. 32)
//  */
// export function createTilemap(
//   world: World,
//   mapW: number,
//   mapH: number,
//   tileSize: number
// ) {
//   const cols = mapW / tileSize;
//   const rows = mapH / tileSize;

//   for (let y = 0; y < rows; y++) {
//     for (let x = 0; x < cols; x++) {
//       const e = world.createEntity();
//       const px = x * tileSize;
//       const py = y * tileSize;
//       const isBlack = (x + y) % 2 === 0;
//       const color: [number, number, number, number] = isBlack
//         ? [0.2, 0.2, 0.2, 1]
//         : [0.8, 0.8, 0.8, 1];
//       world.addComponent(
//         e,
//         new TransformComponent([px, py], [tileSize, tileSize], 0)
//       );
//       world.addComponent(e, new ColorComponent(color));
//     }
//   }
// }

// /**
//  * Populate the world with a number of random quads
//  */
// export function createRandomQuads(
//   world: World,
//   mapW: number,
//   mapH: number,
//   count: number = 1000
// ) {
//   for (let i = 0; i < count; i++) {
//     const e = world.createEntity();
//     const x = Math.random() * mapW;
//     const y = Math.random() * mapH;
//     const size = 10 + Math.random() * 20;
//     const rotation = Math.random() * Math.PI * 2;
//     const color: [number, number, number, number] = [
//       Math.random(),
//       Math.random(),
//       Math.random(),
//       1,
//     ];

//     const transform = new TransformComponent([x, y], [size, size], rotation);
//     world.addComponent(e, transform);
//     world.addComponent(e, new ColorComponent(color));
//   }
// }

// /**
//  * Build a world‐space AABB for a unit quad [0,0→1,1] after
//  * applying scale, rotation, then translation exactly as your shader does.
//  * @param t  the transform component of the quad
//  */
// export function makeAABB(
//   position: [number, number],
//   scale: [number, number],
//   rotation: number
// ): AABB {
//   const [px, py] = position;
//   const [sx, sy] = scale;

//   // if rotation is 0, we can skip the trig
//   if (rotation === 0) {
//     return {
//       minX: px,
//       minY: py,
//       maxX: px + sx,
//       maxY: py + sy,
//     };
//   }

//   const θ = rotation;
//   const c = Math.cos(θ),
//     s = Math.sin(θ);

//   // unit‐quad corners
//   const corners = [
//     [0, 0],
//     [1, 0],
//     [0, 1],
//     [1, 1],
//   ] as const;

//   let minX = Infinity;
//   let minY = Infinity;
//   let maxX = -Infinity;
//   let maxY = -Infinity;

//   for (const [ux, uy] of corners) {
//     // scale
//     const x = ux * sx;
//     const y = uy * sy;
//     // rotate
//     const rx = x * c - y * s;
//     const ry = x * s + y * c;
//     // translate
//     const wx = rx + px;
//     const wy = ry + py;

//     if (wx < minX) minX = wx;
//     if (wx > maxX) maxX = wx;
//     if (wy < minY) minY = wy;
//     if (wy > maxY) maxY = wy;
//   }

//   return { minX, minY, maxX, maxY };
// }

// /**
//  * AABB intersection test
//  */
// export function intersectsAABB(a: AABB, b: AABB): boolean {
//   return !(
//     b.minX > a.maxX ||
//     b.maxX < a.minX ||
//     b.minY > a.maxY ||
//     b.maxY < a.minY
//   );
// }
