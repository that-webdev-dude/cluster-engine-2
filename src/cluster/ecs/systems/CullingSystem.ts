// src/ecs/systems/CullingSystem.ts
import { System } from "../System";
import { World } from "../World";
import {
  TransformComponent,
  CameraComponent,
  VisibleComponent,
} from "../components";

// TODO:
// implement more advanced spatial partitioning (uniform grid or quadtree) in CullingSystem for even faster frustum tests.
export class CullingSystem implements System {
  constructor(private world: World) {}

  update(delta: number) {
    const cameraId = this.world.query(CameraComponent)[0]!;
    const camera = this.world.getComponent(cameraId, CameraComponent)!;

    // For simplicity, assume our quad’s AABB is [pos.x, pos.x + scale.x] etc.
    const all = this.world.query(TransformComponent);
    for (const e of all) {
      const t = this.world.getComponent(e, TransformComponent)!;
      const halfW = t.scale[0];
      const halfH = t.scale[1];
      const xMin = t.position[0] - halfW;
      const xMax = t.position[0] + halfW;
      const yMin = t.position[1] - halfH;
      const yMax = t.position[1] + halfH;

      const visible =
        xMax >= camera.x &&
        xMin <= camera.x + camera.width &&
        yMax >= camera.y &&
        yMin <= camera.y + camera.height;

      const hasTag = !!this.world.getComponent(e, VisibleComponent);
      if (visible && !hasTag) {
        this.world.addComponent(e, new VisibleComponent());
      } else if (!visible && hasTag) {
        this.world.removeComponent(e, VisibleComponent);
      }
    }
  }
}
