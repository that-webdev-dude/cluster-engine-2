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
// We’ve now got “brute-force” per-entity frustum culling in place, and it’ll work fine up to a few tens of thousands of quads.
// If you start pushing past ~50 k entities, you’ll see the cost of scanning every Transform each frame creep up.
// So, on the culling front you have two options:
// Leave it as is if your performance is already acceptable.
// Add spatial partitioning—for example:
// A simple uniform grid: bin each entity into a cell based on its position/scale, then only test the handful of cells overlapping the camera’s bounds.
// Or a quadtree/BVH: dynamically insert/remove entities into tree nodes so your per-frame cull only visits O(log N) nodes, not all N entities.
// Either of those would slot into your CullingSystem with minimal changes: you just replace the “for every entity” loop with “for every entity in the visible cells/nodes.”
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
