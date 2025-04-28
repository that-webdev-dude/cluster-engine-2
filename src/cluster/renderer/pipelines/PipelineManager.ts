// src/renderer/PipelineManager.ts
import { Pipeline } from "./Pipeline";

export class PipelineManager {
  private current: Pipeline | null = null;

  /**
   * Bind a pipeline if it’s not already active.
   * Automatically unbinds the previous one.
   */
  bind(gl: WebGL2RenderingContext, pso: Pipeline) {
    if (this.current !== pso) {
      this.current?.unbind(gl);
      pso.bind(gl);
      this.current = pso;
    }
  }

  /** Force unbind of whatever is active */
  unbind(gl: WebGL2RenderingContext) {
    this.current?.unbind(gl);
    this.current = null;
  }
}
