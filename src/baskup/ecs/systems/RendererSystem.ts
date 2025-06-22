// // src/renderer/RenderSystem.ts

// import { World } from "../../ecs/World";
// import { ColorComponent, CameraComponent } from "../../ecs/components";
// import { RendererV3 } from "../../renderer/RendererV3";
// import { Pipeline } from "../../renderer/pipelines/Pipeline";
// import { InstancedQuadPSO } from "../../renderer/pipelines/Pipeline";
// import { PipelineManager } from "../../renderer/pipelines/PipelineManager";
// import { config } from "../../config";

// const { viewport } = config;

// /**
//  * RenderSystem now reads transform and visibility data directly from chunked storages
//  * for maximum performance and zero Map lookups in the hot path.
//  */
// export class RenderSystem {
//   private pm = new PipelineManager();
//   private gl: WebGL2RenderingContext;
//   private quadPSO: InstancedQuadPSO;

//   private instanceData = new Float32Array(0);
//   private capacityFloats = 0;

//   constructor(private world: World, private renderer: RendererV3) {
//     this.gl = renderer.gl;
//     this.quadPSO = Pipeline.createInstancedQuadPSO(
//       renderer.gl,
//       viewport.width,
//       viewport.height
//     );

//     this.renderer.onResize((w, h) => this.quadPSO.onResize(w, h));
//     this.quadPSO.onResize(viewport.width, viewport.height);
//   }

//   /**
//    * Render with interpolation factor alpha.
//    * Packs position, scale, rotation (interpolated) and color directly from SoA storage,
//    * using a pre-chunk visibility flag array instead of components.
//    */
//   public render(alpha: number): void {
//     const floats = this.quadPSO.floatsPerInstance;
//     let cursor = 0;

//     // Second pass: pack instance data
//     cursor = 0;

//     // Pack in one pass—no separate count phase
//     this.world.transformStorage.forEachChunk(
//       (pos, scale, rot, prevPos, prevScale, prevRot, ents, len) => {
//         const vis = this.world.visibilityStorage.getFlagsForChunk(ents[0]);
//         const cols = this.world.colorStorage.getColorsForChunk(ents[0]);

//         for (let i = 0; i < len; i++) {
//           if (!vis[i]) continue;

//           const neededLen = cursor + floats;
//           if (this.instanceData.length < neededLen) {
//             // allocate a bigger buffer (e.g. double or just the exact neededLen)
//             const newSize = Math.max(
//               neededLen,
//               this.instanceData.length * 2 || floats
//             );
//             const next = new Float32Array(newSize);
//             next.set(this.instanceData, 0);
//             this.instanceData = next;
//           }

//           // write into instanceData at offset `cursor`
//           const b = cursor;
//           const mix = (a: number, c: number) => a + (c - a) * alpha;

//           this.instanceData[b + 0] = mix(prevPos[2 * i], pos[2 * i]);
//           this.instanceData[b + 1] = mix(prevPos[2 * i + 1], pos[2 * i + 1]);
//           this.instanceData[b + 2] = mix(prevScale[2 * i], scale[2 * i]);
//           this.instanceData[b + 3] = mix(
//             prevScale[2 * i + 1],
//             scale[2 * i + 1]
//           );
//           this.instanceData[b + 4] = mix(prevRot[i], rot[i]);
//           this.instanceData.set(cols.subarray(4 * i, 4 * i + 4), b + 5);

//           cursor += floats;
//         }
//       }
//     );

//     const instanceCount = cursor / floats;
//     if (instanceCount === 0) {
//       this.renderer.clear();
//       return;
//     }

//     // Upload GPU buffer
//     this.quadPSO.updateInstances!(this.gl, this.instanceData, instanceCount);

//     // Draw
//     this.renderer.clear();
//     this.pm.bind(this.gl, this.quadPSO);

//     // upload camera offset
//     const camId = this.world.query(CameraComponent)[0]!;
//     const cam = this.world.getComponent(camId, CameraComponent)!;
//     this.gl.uniform2f((this.quadPSO as any).uCamLoc, cam.x, cam.y);

//     this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, instanceCount);
//     this.pm.unbind(this.gl);
//   }
// }
