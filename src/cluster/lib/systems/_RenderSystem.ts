import { Cmath } from "../../tools/Cmath";
import { System } from "../../ecs/System";
import { Storage } from "../../ecs/Storage";
import { TreeNode } from "../../tools/Tree";
import * as Components from "../components";

export class RenderSystem extends System {
  context: CanvasRenderingContext2D;

  constructor() {
    super();

    const canvas = document.querySelector("canvas");

    if (!canvas) throw new Error("RenderSystem: Canvas not found");

    this.context = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  private _updateTreeNode(
    storage: Storage,
    node: TreeNode<number>,
    dt: number,
    t: number
  ) {
    const entity = node.value;

    // checki if the entity is alive
    if (
      storage.hasEntityComponent(entity, "Dead") ||
      storage.hasEntityComponent(entity, "Sleep")
    ) {
      return;
    }

    const positionComponent =
      storage.getEntityComponent<Components.Position>(entity, "Position") ||
      undefined;

    const anchorComponent =
      storage.getEntityComponent<Components.Anchor>(entity, "Anchor") ||
      undefined;

    const angleComponent =
      storage.getEntityComponent<Components.Angle>(entity, "Angle") ||
      undefined;

    const alphaComponent =
      storage.getEntityComponent<Components.Alpha>(entity, "Alpha") ||
      undefined;

    this.context.save();

    if (alphaComponent) {
      this.context.globalAlpha *= Cmath.clamp(alphaComponent.value, 0, 1);
    }

    if (positionComponent) {
      this.context.translate(positionComponent.x, positionComponent.y);
    }

    if (anchorComponent) {
      this.context.translate(anchorComponent.x, anchorComponent.y);
    }

    if (angleComponent) {
      const pivotComponent =
        storage.getEntityComponent<Components.Pivot>(entity, "Pivot") ||
        undefined;

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
      storage.getEntityComponent<Components.Fill>(entity, "Fill") || undefined;

    const strokeComponent =
      storage.getEntityComponent<Components.Stroke>(entity, "Stroke") ||
      undefined;

    const shadowComponent =
      storage.getEntityComponent<Components.Shadow>(entity, "Shadow") ||
      undefined;

    const rectangleComponent =
      storage.getEntityComponent<Components.Rectangle>(entity, "Rectangle") ||
      storage.getEntityComponent<Components.Size>(entity, "Size") ||
      undefined;

    if (rectangleComponent) {
      this.context.fillStyle = fillComponent?.value || "";
      this.context.strokeStyle = strokeComponent?.value || "";
      this.context.shadowBlur = shadowComponent?.blur || 0;
      this.context.shadowColor = shadowComponent?.value || "transparent";
      this.context.lineWidth = strokeComponent?.width || 1;
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
      storage.getEntityComponent<Components.Circle>(entity, "Circle") ||
      undefined;

    if (circleComponent) {
      this.context.beginPath();
      this.context.arc(0, 0, circleComponent.radius, 0, Math.PI * 2, false);
      this.context.fillStyle = fillComponent?.value || "";
      this.context.fill();
      this.context.strokeStyle = strokeComponent?.value || "";
      this.context.shadowBlur = shadowComponent?.blur || 0;
      this.context.shadowColor = shadowComponent?.value || "transparent";
      this.context.lineWidth = strokeComponent?.width || 1;
      this.context.stroke();
      this.context.closePath();

      // debug center of circle
      // this.context.fillStyle = "red";
      // this.context.fillRect(-1, -1, 2, 2);
    }

    // render Polygon
    const polygonComponent =
      storage.getEntityComponent<Components.Polygon>(entity, "Polygon") ||
      storage.getEntityComponent<Components.Vertices>(entity, "Vertices") ||
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
      this.context.shadowBlur = shadowComponent?.blur || 0;
      this.context.shadowColor = shadowComponent?.value || "transparent";
      this.context.lineWidth = strokeComponent?.width || 1;
      this.context.stroke();

      // debug bounding box
      // this.context.strokeStyle = "red";
      // this.context.strokeRect(
      //   0,
      //   0,
      //   polygonComponent.width,
      //   polygonComponent.height
      // );

      // debug position
      // this.context.fillStyle = "red";
      // this.context.fillRect(-1, -1, 2, 2);

      // const isParticle = storage.hasEntityComponent(entity, "Particle");
      // if (isParticle && positionComponent) {
      //   console.log(positionComponent.x, positionComponent.y);
      // }
    }

    // render Text
    const textComponent =
      storage.getEntityComponent<Components.Text>(entity, "Text") || undefined;

    if (textComponent) {
      const fontComponent =
        storage.getEntityComponent<Components.Font>(entity, "Font") ||
        undefined;

      const alignComponent =
        storage.getEntityComponent<Components.Align>(entity, "Align") ||
        undefined;

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
      storage.getEntityComponent<Components.Sprite>(entity, "Sprite") ||
      undefined;

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

    // DEBUG AREA
    // DEBUG THE PROPERTY RADIUS OF THE COLLISION COMPONENT
    // const collisionComponent = storage.getEntityComponent<Components.Collision>(
    //   entity,
    //   "Collision"
    // );
    // if (collisionComponent && collisionComponent.radius) {
    //   this.context.beginPath();
    //   this.context.arc(0, 0, collisionComponent.radius, 0, Math.PI * 2, false);
    //   this.context.strokeStyle = "red";
    //   this.context.stroke();
    //   this.context.closePath();
    // }

    // recursive call
    node.children.forEach((child) => {
      this._updateTreeNode(storage, child, dt, t);
    });

    this.context.restore();
  }

  update(storage: Storage, dt: number, t: number) {
    const root = storage.getEntityNode(0);
    if (!root) return;

    this._updateTreeNode(storage, root, dt, t);
  }
}
