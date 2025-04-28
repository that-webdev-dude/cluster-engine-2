// src/ecs/System.ts
export interface System {
  /** Called once before the frame loop starts (optional) */
  init?(): void;
  /** Called every tick, before rendering */
  update(delta: number): void;
  /** Called once if you ever tear everything down */
  destroy?(): void;
}
