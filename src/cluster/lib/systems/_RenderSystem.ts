import { Cmath } from "../../tools/Cmath";
import { System } from "../../ecs/System";
import { Entity } from "../../ecs/Entity";
import * as Components from "../components";

export class RenderSystem extends System {
  context: CanvasRenderingContext2D;

  constructor() {
    super([Components.Position.name]);

    const canvas = document.querySelector("canvas");

    if (!canvas) throw new Error("RenderSystem: Canvas not found");

    this.context = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  update(entity: Entity, dt: number, t: number) {
    //     if (entity.dead) return;

    const positionComponent =
      entity.getComponent<Components.Position>("Position") || undefined;

    const angleComponent =
      entity.getComponent<Components.Angle>("Angle") || undefined;

    const alphaComponent =
      entity.getComponent<Components.Alpha>("Alpha") || undefined;

    this.context.save();

    if (alphaComponent) {
      this.context.globalAlpha *= Cmath.clamp(alphaComponent.value, 0, 1);
    }

    if (positionComponent) {
      this.context.translate(positionComponent.x, positionComponent.y);
    }

    if (angleComponent) {
      const pivotComponent =
        entity.getComponent<Components.Pivot>("Pivot") || undefined;

      if (pivotComponent) {
        this.context.translate(pivotComponent.x, pivotComponent.y);
      }
      this.context.rotate((angleComponent.value * Math.PI) / 180);
      if (pivotComponent) {
        this.context.translate(-pivotComponent.x, -pivotComponent.y);
      }
    }

    // render Rectangles
    const fillComponent =
      entity.getComponent<Components.Fill>("Fill") || undefined;

    const strokeComponent =
      entity.getComponent<Components.Stroke>("Stroke") || undefined;

    const rectangleComponent =
      entity.getComponent<Components.Rectangle>("Rectangle") ||
      entity.getComponent<Components.Size>("Size") ||
      undefined;

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

    // render Circle
    const circleComponent =
      entity.getComponent<Components.Circle>("Circle") || undefined;

    if (circleComponent) {
      this.context.beginPath();
      this.context.arc(0, 0, circleComponent.radius, 0, Math.PI * 2, false);
      this.context.fillStyle = fillComponent?.value || "";
      this.context.fill();
      this.context.strokeStyle = strokeComponent?.value || "";
      this.context.stroke();
      this.context.closePath();
    }

    // render Polygon
    const polygonComponent =
      entity.getComponent<Components.Polygon>("Polygon") ||
      entity.getComponent<Components.Vertices>("Vertices") ||
      undefined;

    if (polygonComponent) {
      this.context.beginPath();
      this.context.moveTo(
        polygonComponent.points[0].x,
        polygonComponent.points[0].y
      );
      for (let i = 1; i < polygonComponent.points.length; i++) {
        this.context.lineTo(
          polygonComponent.points[i].x,
          polygonComponent.points[i].y
        );
      }
      this.context.closePath();
      this.context.fillStyle = fillComponent?.value || "";
      this.context.fill();
      this.context.strokeStyle = strokeComponent?.value || "";
      this.context.stroke();
    }

    // render Text
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

    //     render sprite
    const spriteComponent =
      entity.getComponent<Components.Sprite>("Sprite") || undefined;

    if (spriteComponent) {
      const { x, y } = spriteComponent.indexToCoords(spriteComponent.frame);
      this.context.drawImage(
        spriteComponent.image,
        x,
        y,
        spriteComponent.width,
        spriteComponent.height,
        0,
        0,
        spriteComponent.width,
        spriteComponent.height
      );
    }

    entity.forEach((child) => {
      this.update(child, dt, t);
    });

    this.context.restore();
  }
}
