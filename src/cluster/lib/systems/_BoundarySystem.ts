import { Cmath } from "../../tools/Cmath";
import { System } from "../../ecs/System";
import { Storage } from "../../ecs/Storage";
import { Vector } from "../../tools/Vector";
import * as Components from "../components";
import * as Types from "../types";

export class BoundarySystem extends System {
  constructor() {
    super([]);
  }

  private _isBoundaryCollision(
    position: Vector,
    width: number,
    height: number,
    boundary: Types.BoundaryBox
  ): "top" | "right" | "bottom" | "left" | undefined {
    let maxX = boundary.width - width;
    let maxY = boundary.height - height;
    let minX = boundary.x;
    let minY = boundary.y;

    // return the screen edge where the collision happened
    if (position.x > maxX) return "right";
    if (position.x < minX) return "left";
    if (position.y > maxY) return "bottom";
    if (position.y < minY) return "top";
  }

  private _isOutOfBounds(
    position: Vector,
    width: number,
    height: number,
    boundary: Types.BoundaryBox
  ): boolean {
    let maxX = boundary.width - width;
    let maxY = boundary.height - height;
    let minX = boundary.x;
    let minY = boundary.y;

    return (
      position.x < minX ||
      position.x > maxX ||
      position.y < minY ||
      position.y > maxY
    );
  }

  private _contain(
    position: Vector,
    width: number,
    height: number,
    boundary: Types.BoundaryBox
  ) {
    let maxX = boundary.width - width;
    let maxY = boundary.height - height;
    let minX = boundary.x;
    let minY = boundary.y;

    position.x = Cmath.clamp(position.x, minX, maxX);
    position.y = Cmath.clamp(position.y, minY, maxY);
  }

  private _bounce(
    position: Vector,
    velocity: Vector,
    width: number,
    height: number,
    boundary: Types.BoundaryBox
  ) {
    let maxX = boundary.width - width;
    let maxY = boundary.height - height;
    let minX = boundary.x;
    let minY = boundary.y;

    if (position.x > maxX) {
      position.x = maxX;
      velocity.x *= -1;
    } else if (position.x < minX) {
      position.x = minX;
      velocity.x *= -1;
    }

    if (position.y > maxY) {
      position.y = maxY;
      velocity.y *= -1;
    } else if (position.y < minY) {
      position.y = minY;
      velocity.y *= -1;
    }
  }

  private _slide(
    position: Vector,
    velocity: Vector,
    width: number,
    height: number,
    boundary: Types.BoundaryBox
  ) {
    let maxX = boundary.width - width;
    let maxY = boundary.height - height;
    let minX = boundary.x;
    let minY = boundary.y;

    if (position.x > maxX) {
      position.x = maxX;
      velocity.x = 0;
    } else if (position.x < minX) {
      position.x = minX;
      velocity.x = 0;
    }

    if (position.y > maxY) {
      position.y = maxY;
      velocity.y = 0;
    } else if (position.y < minY) {
      position.y = minY;
      velocity.y = 0;
    }
  }

  private _wrap(
    position: Vector,
    anchor: Vector,
    width: number,
    height: number,
    boundary: Types.BoundaryBox
  ) {
    let maxX = boundary.width;
    let maxY = boundary.height;
    let minX = boundary.x;
    let minY = boundary.y;

    if (position.x + anchor.x > maxX) {
      position.x = minX - width - anchor.x;
    } else if (position.x + anchor.x < minX - width) {
      position.x = maxX + anchor.x;
    }

    if (position.y + anchor.y > maxY) {
      position.y = minY - height - anchor.y;
    } else if (position.y + anchor.y < minY - height) {
      position.y = maxY + anchor.y;
    }
  }

  update(storage: Storage, dt: number) {
    const entities = storage.getEntityBatch([
      Components.Boundary.name,
      Components.Position.name,
    ]);

    if (!entities.length) return;

    // systemStarted
    for (let entity of entities) {
      // check if entity is alive
      if (storage.hasEntityComponent(entity, "Dead")) {
        continue;
      }

      try {
        const boundaryComponent =
          storage.getEntityComponent<Components.Boundary>(entity, "Boundary");

        const positionComponent =
          storage.getEntityComponent<Components.Position>(entity, "Position");

        if (!boundaryComponent || !positionComponent) continue;

        const rectComponent = storage.getEntityComponent<Components.Rectangle>(
          entity,
          "Rectangle"
        );

        const spriteComponent = storage.getEntityComponent<Components.Sprite>(
          entity,
          "Sprite"
        );

        const sizeComponent = storage.getEntityComponent<Components.Size>(
          entity,
          "Size"
        );

        const circleComponent = storage.getEntityComponent<Components.Circle>(
          entity,
          "Circle"
        );

        const polygonComponent = storage.getEntityComponent<Components.Polygon>(
          entity,
          "Polygon"
        );

        let width = 0;
        let height = 0;

        width =
          rectComponent?.width ||
          sizeComponent?.width ||
          spriteComponent?.width ||
          circleComponent?.width ||
          polygonComponent?.width ||
          0;
        height =
          rectComponent?.height ||
          sizeComponent?.height ||
          spriteComponent?.height ||
          circleComponent?.height ||
          polygonComponent?.height ||
          0;

        if (width === 0 || height === 0) continue;

        // let screenCollision = this._testScreenCollision(
        //   positionComponent.vector,
        //   width,
        //   height
        // );

        const velocityComponent =
          storage.getEntityComponent<Components.Velocity>(entity, "Velocity");

        const anchorComponent = storage.getEntityComponent<Components.Anchor>(
          entity,
          "Anchor"
        );

        switch (boundaryComponent?.behavior) {
          case "wrap":
            this._wrap(
              positionComponent.vector,
              anchorComponent?.vector || new Vector(0, 0),
              width,
              height,
              boundaryComponent.boundary
            );
            break;
          case "contain":
            this._contain(
              positionComponent.vector,
              width,
              height,
              boundaryComponent.boundary
            );
            break;
          case "bounce":
            if (velocityComponent) {
              this._bounce(
                positionComponent.vector,
                velocityComponent.vector,
                width,
                height,
                boundaryComponent.boundary
              );
            }
            break;
          case "slide":
            if (velocityComponent) {
              this._slide(
                positionComponent.vector,
                velocityComponent.vector,
                width,
                height,
                boundaryComponent.boundary
              );
            }
            break;
          case "sleep":
            if (
              this._isOutOfBounds(
                positionComponent.vector,
                width,
                height,
                boundaryComponent.boundary
              )
            ) {
              storage.addEntityComponent(entity, [
                new Components.Active({
                  value: false,
                }),
              ]);
            }
            break;
          case "die":
            if (
              this._isOutOfBounds(
                positionComponent.vector,
                width,
                height,
                boundaryComponent.boundary
              )
            ) {
              storage.addEntityComponent(entity, [
                new Components.Dead({
                  value: true,
                }),
              ]);
            }
            break;
          default:
            break;
        }
      } catch (error) {
        // do something with the error
      }
    }

    // systemUpdated
  }
}
