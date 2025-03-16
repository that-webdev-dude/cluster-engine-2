import { System } from "../../ecs/System";
import { Storage } from "../../ecs/Storage";
import { Physics } from "../../tools/Physics";
import * as Components from "../components";

export class MotionSystem extends System {
  constructor() {
    super();
  }

  update(storage: Storage, dt: number) {
    const batch = storage.getEntityBatch([
      Components.Position.name,
      Components.Velocity.name,
    ]);

    if (!batch.length) return;

    for (let entity of batch) {
      // check if the entity is alive
      if (
        storage.hasEntityComponent(entity, "Dead") ||
        storage.hasEntityComponent(entity, "Sleep")
      ) {
        continue;
      }

      const positionComponent = storage.getEntityComponent<Components.Position>(
        entity,
        "Position"
      )!;

      const velocityComponent = storage.getEntityComponent<Components.Velocity>(
        entity,
        "Velocity"
      );

      const accelerationComponent =
        storage.getEntityComponent<Components.Acceleration>(
          entity,
          "Acceleration"
        );

      const frictionComponent = storage.getEntityComponent<Components.Friction>(
        entity,
        "Friction"
      );

      if (accelerationComponent && velocityComponent) {
        if (frictionComponent) {
          Physics.applyFriction(
            accelerationComponent.vector,
            velocityComponent.vector,
            frictionComponent.value
          );
        }

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
      }

      if (!accelerationComponent && velocityComponent) {
        positionComponent.x += velocityComponent.x * dt;
        positionComponent.y += velocityComponent.y * dt;
      }

      // const angleComponent = storage.getEntityComponent<Components.Angle>(
      //   entity,
      //   "Angle"
      // );
      // if (angleComponent) {
      //   angleComponent.value += 4;
      //   if (angleComponent.value > 360) {
      //     angleComponent.value = 0;
      //   }
      // }
    }
  }
}
