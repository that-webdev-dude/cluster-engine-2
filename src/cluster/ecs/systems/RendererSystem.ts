// src/renderer/RenderSystem.ts

import { World } from "../../ecs/World";
import {
  TransformComponent,
  ColorComponent,
  VisibleComponent,
} from "../../ecs/components";
import { RendererV3 } from "../../renderer/RendererV3";
import { Pipeline } from "../../renderer/pipelines/Pipeline";
import { InstancedQuadPSO } from "../../renderer/pipelines/Pipeline";
import { PipelineManager } from "../../renderer/pipelines/PipelineManager";
import { CameraComponent } from "../../ecs/components";

export class RenderSystem {
  private pm: PipelineManager = new PipelineManager();
  private gl: WebGL2RenderingContext;
  private quadPSO: InstancedQuadPSO;

  private instanceData: Float32Array = new Float32Array(0);
  private capacityFloats = 0;

  constructor(private world: World, private renderer: RendererV3) {
    this.gl = renderer.gl;
    this.quadPSO = Pipeline.createInstancedQuadPSO(
      renderer.gl,
      renderer.width,
      renderer.height
    );

    // subscribe to canvas resize
    this.renderer.onResize((w, h) => {
      this.quadPSO.onResize(w, h);
    });

    // initialize onResize callback
    this.quadPSO.onResize(this.renderer.width, this.renderer.height);
  }

  /** Call this each frame to render all entities with Transform+Color */
  public update(): void {
    const ents = this.world.query(
      TransformComponent,
      VisibleComponent,
      ColorComponent
    );
    const count = ents.length;
    if (count === 0) {
      this.renderer.clear();
      return; // nothing to draw
    }

    const needed = count * this.quadPSO.floatsPerInstance;

    // 1) resize + pack CPU buffer
    if (needed > this.capacityFloats) {
      this.capacityFloats = needed;
      this.instanceData = new Float32Array(needed);
    }
    ents.forEach((e, i) => {
      const t = this.world.getComponent(e, TransformComponent)!;
      const c = this.world.getComponent(e, ColorComponent)!;
      const base = i * this.quadPSO.floatsPerInstance;
      this.instanceData[base + 0] = t.position[0];
      this.instanceData[base + 1] = t.position[1];
      this.instanceData[base + 2] = t.scale[0];
      this.instanceData[base + 3] = t.scale[1];
      this.instanceData[base + 4] = t.rotation;
      this.instanceData.set(c.color, base + 5);
    });

    // push instance data to the PSO
    this.quadPSO.updateInstances!(this.gl, this.instanceData, count);

    // 3) clear + draw
    this.renderer.clear();
    // use pm.bind instead of direct pso.bind
    this.quadPSO.bind(this.gl);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, count);
    // no explicit unbind needed here if you’re going to draw
    // other PSOs later; at the very end of the frame you could:
    // ...
    this.pm.unbind(this.gl);
  }

  public render(alpha: number): void {
    const ents = this.world.query(
      TransformComponent,
      VisibleComponent,
      ColorComponent
    );
    const count = ents.length;
    if (count === 0) {
      this.renderer.clear();
      return;
    }

    const floats = this.quadPSO.floatsPerInstance;
    const needed = count * floats;
    if (needed > this.capacityFloats) {
      this.capacityFloats = needed;
      this.instanceData = new Float32Array(needed);
    }

    // one pass: interpolate and pack
    ents.forEach((e, i) => {
      const t = this.world.getComponent(e, TransformComponent)!;
      const c = this.world.getComponent(e, ColorComponent)!;
      const b = i * floats;

      // lerp helper
      const mix = (a: number, b: number) => a + (b - a) * alpha;

      // position
      this.instanceData[b + 0] = mix(t.prevPosition[0], t.position[0]);
      this.instanceData[b + 1] = mix(t.prevPosition[1], t.position[1]);

      // scale
      this.instanceData[b + 2] = mix(t.prevScale[0], t.scale[0]);
      this.instanceData[b + 3] = mix(t.prevScale[1], t.scale[1]);

      // rotation
      this.instanceData[b + 4] = mix(t.prevRotation, t.rotation);

      // color (no interp)
      this.instanceData.set(c.color, b + 5);
    });

    // upload & draw as before
    this.quadPSO.updateInstances!(this.gl, this.instanceData, count);
    this.renderer.clear();
    this.pm.bind(this.gl, this.quadPSO);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, count);
    this.pm.unbind(this.gl);
  }
}
