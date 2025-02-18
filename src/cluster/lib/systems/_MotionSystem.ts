import { System } from "../../ecs/System";
import { Entity } from "../../ecs/Entity";
import * as Components from "../components";

export class MotionSystem extends System {
  constructor() {
    super(["Position", "Velocity"]);
  }

  update(layer: Entity, dt: number) {
    const batch = layer.getBatch(this.mask);

    for (let entity of batch) {
      // if (entity.dead || !entity.active) continue;

      try {
        const positionComponent =
          entity.getComponent<Components.Position>("Position")!;

        const velocityComponent =
          entity.getComponent<Components.Velocity>("Velocity")!;

        const accelerationComponent =
          entity.getComponent<Components.Acceleration>("Acceleration") ||
          undefined;

        if (accelerationComponent) {
          let vx = velocityComponent.x + accelerationComponent.x * dt;
          let vy = velocityComponent.y + accelerationComponent.y * dt;

          let dx = (velocityComponent.x + vx) * 0.5 * dt;
          let dy = (velocityComponent.y + vy) * 0.5 * dt;

          positionComponent.x += dx;
          positionComponent.y += dy;
          velocityComponent.x = vx;
          velocityComponent.y = vy;

          accelerationComponent.x = 0;
          accelerationComponent.y = 0;
        } else {
          positionComponent.x += velocityComponent.x * dt;
          positionComponent.y += velocityComponent.y * dt;
        }
      } catch (error) {
        // do something with the error
      }
    }
  }
}
