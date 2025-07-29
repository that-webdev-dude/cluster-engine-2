import { charactersImg } from "../assets";
import { StorageUpdateSystem } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { View } from "../../../cluster";
import { Component } from "../components";
import { DESCRIPTORS } from "../components";

class Spritesheet {
    constructor(
        readonly img: HTMLImageElement,
        readonly rows: number,
        readonly cols: number
    ) {}

    get width() {
        return this.img.naturalWidth;
    }

    get height() {
        return this.img.naturalHeight;
    }

    get frameWidth() {
        return this.img.naturalWidth / this.cols;
    }

    get frameHeight() {
        return this.img.naturalHeight / this.rows;
    }

    framePxFromMap(row: number, col: number): [number, number] {
        return [col * this.frameWidth, row * this.frameHeight];
    }

    frameIndexFromMap(row: number, col: number): number {
        return row * this.cols + col;
    }

    frameMapFromPx(px: number, py: number): [number, number] {
        const col = Math.floor(px / this.frameWidth);
        const row = Math.floor(py / this.frameHeight);
        return [row, col];
    }

    frameIndexFromPx(px: number, py: number): number {
        const [row, col] = this.frameMapFromPx(px, py);
        return this.frameIndexFromMap(row, col);
    }

    framePxFromIndex(index: number): [number, number] {
        const row = Math.floor(index / this.cols);
        const col = index % this.cols;
        return this.framePxFromMap(row, col);
    }

    frameMapFromIndex(index: number): [number, number] {
        const row = Math.floor(index / this.cols);
        const col = index % this.cols;
        return [row, col];
    }

    frameRectFromMap(
        row: number,
        col: number
    ): [number, number, number, number] {
        const [x, y] = this.framePxFromMap(row, col);
        return [x, y, this.frameWidth, this.frameHeight];
    }

    frameRectFromIndex(index: number): [number, number, number, number] {
        const [row, col] = this.frameMapFromIndex(index);
        return this.frameRectFromMap(row, col);
    }
}

const spritesheet = new Spritesheet(charactersImg, 4, 3);

export class AnimationSystem extends StorageUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.Sprite, Component.Animation],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                for (let i = 0; i < count; i++) {
                    const sprite = chunk.views.Sprite;
                    const animation = chunk.views.Animation;

                    animation[i * 6 + 5] += dt; // increment elapsed time

                    let animationStartIndex = animation[i * 6 + 0];
                    let animationEndIndex = animation[i * 6 + 1];
                    let animationTime = animation[i * 6 + 4];
                    let animationElapsed = animation[i * 6 + 5];

                    if (animationElapsed >= animationTime) {
                        animation[i * 6 + 5] = 0;

                        const spriteCurrentX = sprite[i * 4 + 0];
                        const spriteCurrentY = sprite[i * 4 + 1];
                        const currentAnimationIndex =
                            spritesheet.frameIndexFromPx(
                                spriteCurrentX,
                                spriteCurrentY
                            );

                        if (currentAnimationIndex < animationEndIndex) {
                            const nextAnimationIndex =
                                currentAnimationIndex + 1;
                            const nextAnimationRect =
                                spritesheet.frameRectFromIndex(
                                    nextAnimationIndex
                                );
                            sprite[i * 4 + 0] = nextAnimationRect[0]; // x in px
                            sprite[i * 4 + 1] = nextAnimationRect[1]; // y in px
                            sprite[i * 4 + 2] = nextAnimationRect[2]; // w in px
                            sprite[i * 4 + 3] = nextAnimationRect[3]; // h in px
                        } else {
                            // Reset to start frame
                            const startFrameRect =
                                spritesheet.frameRectFromIndex(
                                    animationStartIndex
                                );

                            sprite[i * 4 + 0] = startFrameRect[0]; // x in px
                            sprite[i * 4 + 1] = startFrameRect[1]; // y in px
                            sprite[i * 4 + 2] = startFrameRect[2]; // w in px
                            sprite[i * 4 + 3] = startFrameRect[3]; // h in px
                        }
                    }
                }
            }
        );
    }
}
