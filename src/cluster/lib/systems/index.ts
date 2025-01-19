import { Cmath } from "../../tools/Cmath";
import { System, Entity } from "../../core/ECS";
import * as Components from "../components";

export class RenderSystem extends System {
  context: CanvasRenderingContext2D;

  constructor() {
    super([]);
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Canvas not found");

    this.context = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  update(entity: Entity, dt: number, t: number) {
    if (entity.dead) return;

    const positionComponent =
      entity.getComponent<Components.Position>("Position") || undefined;
    const alphaComponent =
      entity.getComponent<Components.Alpha>("Alpha") || undefined;

    this.context.save();

    if (alphaComponent) {
      this.context.globalAlpha *= Cmath.clamp(alphaComponent.value, 0, 1);
    }

    if (positionComponent) {
      this.context.translate(positionComponent.x, positionComponent.y);
    }

    // render rectangleComponent
    const fillComponent =
      entity.getComponent<Components.Fill>("Fill") || undefined;
    const strokeComponent =
      entity.getComponent<Components.Stroke>("Stroke") || undefined;
    const rectangleComponent =
      entity.getComponent<Components.Rectangle>("Rectangle") || undefined;

    if (rectangleComponent) {
      this.context.fillStyle = fillComponent?.value || "";
      this.context.strokeStyle = strokeComponent?.value || "";
      this.context.strokeRect(
        0,
        0,
        rectangleComponent.width,
        rectangleComponent.height
      );
      this.context.fillRect(
        0,
        0,
        rectangleComponent.width,
        rectangleComponent.height
      );
    }

    // render textComponent
    const textComponent =
      entity.getComponent<Components.Text>("Text") || undefined;

    if (textComponent) {
      const fontComponent =
        entity.getComponent<Components.Font>("Font") || undefined;
      const alignComponent =
        entity.getComponent<Components.Align>("Align") || undefined;

      // get stored value from store if required
      // if (textComponent.stored) {
      //   textComponent.value = Store.get(textComponent.stored);
      // }
      this.context.font = fontComponent?.value || "";
      this.context.textAlign = alignComponent?.value || "center";
      this.context.fillStyle = fillComponent?.value || "";
      this.context.fillText(textComponent.value, 0, 0);
    }

    entity.children.forEach((child) => {
      this.update(child, dt, t);
    });

    this.context.restore();
  }
}

export class GravitySystem extends System {
  constructor() {
    super(["Gravity"]);
  }

  update(entity: Entity, dt: number, t: number) {
    if (entity.dead) return;
    // do something
    entity.children.forEach((child) => {
      this.update(child, dt, t);
    });
  }
}
