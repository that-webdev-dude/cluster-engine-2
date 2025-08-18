import { spritesheet } from "../assets";
import { Component } from "../components";
import { View } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { ECSUpdateSystem } from "../../../cluster";

export class AnimationSystem extends ECSUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.Sprite, Component.Animation],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                for (let i = 0; i < count; i++) {
                    const sprite = chunk.views.Sprite;
                    const animation = chunk.views.Animation;

                    animation[i * 6 + 4] += dt; // increment animationElapsed

                    // prettier-ignore
                    let animationStartIndex     = animation[i * 6 + 0];
                    // prettier-ignore
                    let animationEndIndex       = animation[i * 6 + 1];
                    // prettier-ignore
                    let animationCurrentIndex   = animation[i * 6 + 2];
                    // prettier-ignore
                    let animationTime           = animation[i * 6 + 3];
                    // prettier-ignore
                    let animationElapsed        = animation[i * 6 + 4];
                    // prettier-ignore
                    let animationPlaying        = animation[i * 6 + 5];

                    if (animationPlaying === 0) {
                        // Reset current frame and elapsed time
                        animation[i * 6 + 2] = animationStartIndex;
                        animation[i * 6 + 4] = 0;

                        // Force the sprite back to the start frame
                        const startRect =
                            spritesheet.frameRectFromIndex(animationStartIndex);
                        sprite[i * 4 + 0] = startRect[0];
                        sprite[i * 4 + 1] = startRect[1];
                        sprite[i * 4 + 2] = startRect[2];
                        sprite[i * 4 + 3] = startRect[3];

                        continue;
                    }

                    if (animation[i * 6 + 4] > animationTime) {
                        animation[i * 6 + 4] = 0;

                        let nextAnimationRect: [number, number, number, number];

                        if (animationCurrentIndex < animationEndIndex) {
                            // proceed to next frame
                            animationCurrentIndex++;

                            animation[i * 6 + 2] = animationCurrentIndex;

                            nextAnimationRect = spritesheet.frameRectFromIndex(
                                animationCurrentIndex
                            );
                        } else {
                            // Reset to start frame
                            nextAnimationRect =
                                spritesheet.frameRectFromIndex(
                                    animationStartIndex
                                );

                            animation[i * 6 + 2] = animationStartIndex;
                        }

                        sprite[i * 4 + 0] = nextAnimationRect[0]; // x in px
                        sprite[i * 4 + 1] = nextAnimationRect[1]; // y in px
                        sprite[i * 4 + 2] = nextAnimationRect[2]; // w in px
                        sprite[i * 4 + 3] = nextAnimationRect[3]; // h in px
                    }
                }
            }
        );
    }
}
