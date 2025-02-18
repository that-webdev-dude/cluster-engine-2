import { Cmath } from "../../tools/Cmath";
import { System } from "../../ecs/System";
import { Entity } from "../../ecs/Entity";
import { Vector } from "../../tools/Vector";

import * as Components from "../components";

const boundaryBehaviors = {
  contain: "contain",
  wrap: "wrap",
  bounce: "bounce",
  sleep: "sleep",
  die: "die",
  slide: "slide",
};

export class BoundarySystem extends System {
  private _screenHeight: number;
  private _screenWidth: number;

  constructor() {
    super(["Boundary", "Position"]);

    const { width = 0, height = 0 } = document.querySelector(
      "canvas"
    ) as HTMLCanvasElement;

    if (!width || !height)
      throw new Error("[BoundarySystem Error] No display found");

    this._screenHeight = height;
    this._screenWidth = width;
  }

  private _testScreenCollision(
    position: Vector,
    width: number,
    height: number
  ): "top" | "right" | "bottom" | "left" | undefined {
    let maxX = this._screenWidth - width;
    let maxY = this._screenHeight - height;

    // return the screen edge where the collision happened
    if (position.x > maxX) return "right";
    if (position.x < 0) return "left";
    if (position.y > maxY) return "bottom";
    if (position.y < 0) return "top";
  }

  private _contain(position: Vector, width: number, height: number) {
    let maxX = this._screenWidth - width;
    let maxY = this._screenHeight - height;
    position.x = Cmath.clamp(position.x, 0, maxX);
    position.y = Cmath.clamp(position.y, 0, maxY);
  }

  private _wrap(position: Vector, width: number, height: number) {
    let maxX = this._screenWidth;
    let maxY = this._screenHeight;
    if (position.x > maxX) {
      position.x = -width;
    } else if (position.x < -width) {
      position.x = maxX;
    }

    if (position.y > maxY) {
      position.y = -height;
    } else if (position.y < -height) {
      position.y = maxY;
    }
  }

  private _bounce(
    position: Vector,
    velocity: Vector,
    width: number,
    height: number
  ) {
    let maxX = this._screenWidth - width;
    let maxY = this._screenHeight - height;
    if (position.x > maxX) {
      position.x = maxX;
      velocity.x *= -1;
    } else if (position.x < 0) {
      position.x = 0;
      velocity.x *= -1;
    }

    if (position.y > maxY) {
      position.y = maxY;
      velocity.y *= -1;
    } else if (position.y < 0) {
      position.y = 0;
      velocity.y *= -1;
    }
  }

  private _slide(
    position: Vector,
    velocity: Vector,
    width: number,
    height: number
  ) {
    let maxX = this._screenWidth - width;
    let maxY = this._screenHeight - height;
    if (position.x > maxX) {
      position.x = maxX;
      velocity.x = 0;
    } else if (position.x < 0) {
      position.x = 0;
      velocity.x = 0;
    }

    if (position.y > maxY) {
      position.y = maxY;
      velocity.y = 0;
    } else if (position.y < 0) {
      position.y = 0;
      velocity.y = 0;
    }
  }

  update(layer: Entity, dt: number) {
    //     if (entities.size === 0) return;

    const entities = layer.getBatch(this.mask);

    // systemStarted
    for (let entity of entities) {
      //       if (entity.dead || !entity.active) continue;

      try {
        const boundaryComponent =
          entity.getComponent<Components.Boundary>("Boundary");

        const positionComponent =
          entity.getComponent<Components.Position>("Position");

        if (!boundaryComponent || !positionComponent) continue;

        const rectComponent =
          entity.getComponent<Components.Rectangle>("Rectangle");

        const spriteComponent =
          entity.getComponent<Components.Sprite>("Sprite");

        const sizeComponent = entity.getComponent<Components.Size>("Size");

        let width = 0;
        let height = 0;

        width =
          rectComponent?.width ||
          sizeComponent?.width ||
          spriteComponent?.width ||
          0;
        height =
          rectComponent?.height ||
          sizeComponent?.height ||
          spriteComponent?.height ||
          0;

        if (width === 0 || height === 0) continue;

        // let screenCollision = this._testScreenCollision(
        //   positionComponent.vector,
        //   width,
        //   height
        // );

        switch (boundaryComponent?.behavior) {
          case boundaryBehaviors.wrap:
            this._wrap(positionComponent.vector, width, height);
            break;
          case boundaryBehaviors.contain:
            this._contain(positionComponent.vector, width, height);
            break;
          case boundaryBehaviors.bounce:
          case boundaryBehaviors.slide:
            const velocityComponent =
              entity.getComponent<Components.Velocity>("Velocity");

            if (velocityComponent && boundaryComponent?.behavior === "bounce") {
              this._bounce(
                positionComponent.vector,
                velocityComponent.vector,
                width,
                height
              );
            }

            if (velocityComponent && boundaryComponent?.behavior === "slide") {
              this._slide(
                positionComponent.vector,
                velocityComponent.vector,
                width,
                height
              );
            }
            break;

          case boundaryBehaviors.sleep:
            console.log("sleep");
            break;
          case boundaryBehaviors.die:
            console.log("die");
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
