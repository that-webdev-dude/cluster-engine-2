// // src/ecs/storage/VisibilityStorage.ts

// import { Entity } from "../World";
// import { TransformStorage } from "./TransformStorage";

// const CHUNK_SIZE = 256;

// export class VisibilityStorage {
//   private flags: Uint8Array[] = [];

//   constructor(private ts: TransformStorage) {
//     // seed initial capacity
//     this.ensureCapacity();
//   }

//   /** Make sure we have one Uint8Array per transform‐chunk */
//   private ensureCapacity() {
//     const needed = this.ts.chunkCount;
//     while (this.flags.length < needed) {
//       this.flags.push(new Uint8Array(CHUNK_SIZE));
//     }
//   }

//   /** Clear all visibility bits */
//   clear() {
//     this.ensureCapacity();
//     for (const f of this.flags) f.fill(0);
//   }

//   /** Mark an entity visible by setting its flag to 1 */
//   setVisible(e: Entity) {
//     this.ensureCapacity();
//     const loc = this.ts.getLocation(e);
//     if (!loc) return;
//     this.flags[loc.chunk][loc.index] = 1;
//   }

//   /** Test an entity’s visibility (still here for debug or one‐offs) */
//   isVisible(e: Entity): boolean {
//     this.ensureCapacity();
//     const loc = this.ts.getLocation(e);
//     return loc ? this.flags[loc.chunk][loc.index] === 1 : false;
//   }

//   /**
//    * Return the entire Uint8Array for the chunk containing `e`.
//    * Up to you to index [i] in your tight loops.
//    */
//   getFlagsForChunk(e: Entity): Uint8Array {
//     this.ensureCapacity();
//     const loc = this.ts.getLocation(e);
//     return loc ? this.flags[loc.chunk] : new Uint8Array(0);
//   }
// }
