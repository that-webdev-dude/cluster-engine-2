// src/renderer/RenderSystem.ts

import { World } from "../../ecs/World";
import {
  ColorComponent,
  VisibleComponent,
  CameraComponent,
} from "../../ecs/components";
import { RendererV3 } from "../../renderer/RendererV3";
import { Pipeline } from "../../renderer/pipelines/Pipeline";
import { InstancedQuadPSO } from "../../renderer/pipelines/Pipeline";
import { PipelineManager } from "../../renderer/pipelines/PipelineManager";
import { config } from "../../config";

const { viewport } = config;

/**
 * RenderSystem now reads transform data directly from TransformStorage chunks
 * for improved performance and coherence with MovementSystem updates.
 */
export class RenderSystem {
  private pm = new PipelineManager();
  private gl: WebGL2RenderingContext;
  private quadPSO: InstancedQuadPSO;

  private instanceData = new Float32Array(0);
  private capacityFloats = 0;

  constructor(private world: World, private renderer: RendererV3) {
    this.gl = renderer.gl;
    this.quadPSO = Pipeline.createInstancedQuadPSO(
      renderer.gl,
      viewport.width,
      viewport.height
    );

    this.renderer.onResize((w, h) => {
      this.quadPSO.onResize(w, h);
    });
    this.quadPSO.onResize(viewport.width, viewport.height);
  }

  /**
   * Render with interpolation factor alpha.
   * Packs position, scale, rotation (interpolated) and color per chunk.
   */
  public render(alpha: number): void {
    const floats = this.quadPSO.floatsPerInstance;
    let cursor = 0;
    let visibleCount = 0;

    // First, compute total needed size
    this.world.transformStorage.forEachChunk(
      (pos, scale, rot, prevPos, prevScale, prevRot, ents, len) => {
        // Filter only visible entities in this chunk
        for (let i = 0; i < len; i++) {
          const e = ents[i];
          if (!this.world.getComponent(e, VisibleComponent)) continue;
          visibleCount++;
        }
      }
    );
    const needed = visibleCount * floats;
    if (needed === 0) {
      this.renderer.clear();
      return;
    }
    if (needed > this.capacityFloats) {
      this.capacityFloats = needed;
      this.instanceData = new Float32Array(needed);
    }

    // Pack data into instanceData
    cursor = 0;
    this.world.transformStorage.forEachChunk(
      (pos, scale, rot, prevPos, prevScale, prevRot, ents, len) => {
        for (let i = 0; i < len; i++) {
          const e = ents[i];
          if (!this.world.getComponent(e, VisibleComponent)) continue;
          const b = cursor;
          const mix = (a: number, b: number) => a + (b - a) * alpha;
          // position
          this.instanceData[b + 0] = mix(prevPos[2 * i + 0], pos[2 * i + 0]);
          this.instanceData[b + 1] = mix(prevPos[2 * i + 1], pos[2 * i + 1]);
          // scale
          this.instanceData[b + 2] = mix(
            prevScale[2 * i + 0],
            scale[2 * i + 0]
          );
          this.instanceData[b + 3] = mix(
            prevScale[2 * i + 1],
            scale[2 * i + 1]
          );
          // rotation
          this.instanceData[b + 4] = mix(prevRot[i], rot[i]);
          // color
          const colorComp = this.world.getComponent(e, ColorComponent)!;
          this.instanceData.set(colorComp.color, b + 5);

          cursor += floats;
        }
      }
    );

    // Upload to GPU
    this.quadPSO.updateInstances!(this.gl, this.instanceData, visibleCount);

    // Draw
    this.renderer.clear();
    this.pm.bind(this.gl, this.quadPSO);

    // upload camera offset
    const camId = this.world.query(CameraComponent)[0]!;
    const cam = this.world.getComponent(camId, CameraComponent)!;
    this.gl.uniform2f((this.quadPSO as any).uCamLoc, cam.x, cam.y);

    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, visibleCount);
    this.pm.unbind(this.gl);
  }
}
