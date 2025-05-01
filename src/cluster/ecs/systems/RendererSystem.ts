// src/renderer/RenderSystem.ts

import { World } from "../../ecs/World";
import { TransformComponent, ColorComponent } from "../../ecs/components";
import { RendererV3 } from "../../renderer/RendererV3";
import { Pipeline } from "../../renderer/pipelines/Pipeline";
import { InstancedQuadPSO } from "../../renderer/pipelines/Pipeline";
import { PipelineManager } from "../../renderer/pipelines/PipelineManager";

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
    const ents = this.world.query(TransformComponent, ColorComponent);
    const count = ents.length;
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
    this.pm.bind(this.gl, this.quadPSO);
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, count);
    // no explicit unbind needed here if you’re going to draw
    // other PSOs later; at the very end of the frame you could:
    // ...
    this.pm.unbind(this.gl);
  }
}
