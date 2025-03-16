import { System } from "../../ecs/System";
import { Storage } from "../../ecs/Storage";
import * as Components from "../components";

export class TransitionSystem extends System {
  update(storage: Storage, dt: number, t: number) {
    const entities = storage.getEntityBatch([Components.Transition.name]);

    if (!entities || !entities.length) return;

    entities.forEach((entity) => {
      const transition = storage.getEntityComponent<Components.Transition>(
        entity,
        Components.Transition.name
      );

      if (!transition) return;

      if (transition.method === "fadeIn") {
        transition.elapsed += dt;
        transition.progress = transition.elapsed / transition.duration;

        const alpha = storage.getEntityComponent<Components.Alpha>(
          entity,
          Components.Alpha.name
        );

        if (alpha) alpha.value = transition.progress;

        if (transition.progress >= 1) {
          storage.removeEntityComponent(entity, Components.Transition.name);
        }
      }

      if (transition.method === "fadeOut") {
        transition.elapsed += dt;
        transition.progress = transition.elapsed / transition.duration;

        const alpha = storage.getEntityComponent<Components.Alpha>(
          entity,
          Components.Alpha.name
        );

        if (alpha) alpha.value = 1 - transition.progress;

        if (transition.progress >= 1) {
          storage.removeEntityComponent(entity, Components.Transition.name);
        }
      }
    });
  }
}
