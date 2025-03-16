// import { System } from "../../ecs/System";
// import { Entity } from "../../ecs/Entity";
// import * as Components from "../components";

// export class AnimationSystem extends System {
//   constructor() {
//     super(["Sprite"]);
//   }

//   update(layer: Entity, dt: number, t: number) {
//     if (layer.dead || !layer.active) return;

//     const batch = layer.getBatch(this.mask);

//     for (const entity of batch) {
//       try {
//         if (entity.dead || !entity.active) continue;

//         const spriteComponent =
//           entity.getComponent<Components.Sprite>("Sprite")!;

//         if (!spriteComponent.animations || !spriteComponent.animations.size)
//           continue;

//         const animation = spriteComponent.animations.get(
//           spriteComponent.currentAnimationName
//         );

//         if (!animation) continue;

//         animation.update(dt);

//         const { currentFrame } = animation;

//         spriteComponent.frame = spriteComponent.matrixToIndex(
//           currentFrame.x,
//           currentFrame.y
//         );
//       } catch (error) {
//         throw new Error(`AnimationSystem: ${error}`);
//       }
//     }
//   }
// }
