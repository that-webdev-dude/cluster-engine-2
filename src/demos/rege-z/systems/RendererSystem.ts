// src/renderer/GLRenderer.ts

import { spritesheet } from "../assets";
import { Component } from "../components";
import { Display } from "../../../cluster";
import { View } from "../../../cluster";
import { Chunk } from "../../../cluster";
import { SpriteData } from "../../../cluster";
import { SpritePipeline } from "../../../cluster";
import { ECSRenderSystem } from "../../../cluster";

export class SpriteRendererSystem extends ECSRenderSystem {
    private renderer = Display.getInstance().createGPURenderingLayer();
    private pipeline: SpritePipeline | null = null;

    // per-instance SoA buffers, size = Chunk.DEFAULT_CAPACITY
    private positions = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private offsets = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private pivots = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private scales = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private angles = new Float32Array(Chunk.DEFAULT_CAPACITY * 1);
    private colors = new Uint8Array(Chunk.DEFAULT_CAPACITY * 4);
    private uvRects = new Float32Array(Chunk.DEFAULT_CAPACITY * 4);

    private cameraPos: [number, number] = [0, 0];

    render(view: View, alpha: number) {
        const gl = this.renderer.gl;

        const spritesheetImg = spritesheet.img;

        // — lazy init pipeline
        if (!this.pipeline) {
            if (spritesheetImg.complete && spritesheetImg.naturalWidth > 0) {
                this.pipeline = SpritePipeline.create(
                    this.renderer,
                    spritesheetImg
                );
            }
        }
        if (!this.pipeline) return;

        // (1) update your camera if you have one
        view.forEachChunkWith([Component.Camera], (chunk) => {
            const cur = chunk.views.Position;
            const prev = chunk.views.PreviousPosition;

            if (!prev) {
                // no PreviousPosition, just use current
                console.warn(
                    "[SpriteRendererSystem]: No PreviousPosition found, using current position for camera"
                );
                prev[0] = cur[0];
                prev[1] = cur[1];
            }
            const interpolatedX = prev[0] + (cur[0] - prev[0]) * alpha;
            const interpolatedY = prev[1] + (cur[1] - prev[1]) * alpha;

            this.cameraPos[0] = Math.floor(interpolatedX);
            this.cameraPos[1] = Math.floor(interpolatedY);
        });

        // (2) draw all entities with a Sprite component
        view.forEachChunkWith(
            [
                Component.Sprite,
                Component.Position,
                Component.Size,
                Component.Color,
            ],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                this.scales.set(chunk.views.Size.subarray(0, count * 2), 0);
                this.colors.set(chunk.views.Color.subarray(0, count * 4), 0);

                // copy over Angle (radians) instead of zeroes:
                if (chunk.views.Angle) {
                    // if you have PreviousAngle and want interpolation you can do that here
                    this.angles.set(chunk.views.Angle.subarray(0, count), 0);
                } else {
                    this.angles.fill(0, 0, count);
                }

                // copy Offset (if you intend to use it) or zero:
                if (chunk.views.Offset) {
                    this.offsets.set(
                        chunk.views.Offset.subarray(0, count * 2),
                        0
                    );
                } else {
                    this.offsets.fill(0);
                }

                // copy Pivot (so your rotation center isn’t always top-left)
                if (chunk.views.Pivot) {
                    this.pivots.set(
                        chunk.views.Pivot.subarray(0, count * 2),
                        0
                    );
                } else {
                    this.pivots.fill(0);
                }

                // Dynamic UVs from the Sprite component
                const s = chunk.views.Sprite; // [frameX,frameY,frameW,frameH] in px
                const img = spritesheetImg;

                for (let i = 0; i < count; i++) {
                    // let's interpolate the positions here
                    // if you have PreviousPosition and want interpolation you can do that here
                    const prevPos = chunk.views.PreviousPosition;
                    const currPos = chunk.views.Position;
                    let posX = 0;
                    let posY = 0;
                    if (prevPos) {
                        posX =
                            prevPos[i * 2 + 0] +
                            (currPos[i * 2 + 0] - prevPos[i * 2 + 0]) * alpha;

                        posY =
                            prevPos[i * 2 + 1] +
                            (currPos[i * 2 + 1] - prevPos[i * 2 + 1]) * alpha;
                    } else {
                        // no PreviousPosition, just use current
                        posX = currPos[i * 2 + 0];
                        posY = currPos[i * 2 + 1];
                    }
                    this.positions[i * 2 + 0] = Math.floor(posX);
                    this.positions[i * 2 + 1] = Math.floor(posY);

                    const fx = s[i * 4 + 0];
                    const fy = s[i * 4 + 1];
                    const fw = s[i * 4 + 2];
                    const fh = s[i * 4 + 3];

                    // normalize the uv's
                    const u0 = fx / img.width;
                    const v0 = fy / img.height;
                    const u1 = (fx + fw) / img.width;
                    const v1 = (fy + fh) / img.height;

                    this.uvRects.set([u0, v0, u1, v1], i * 4);
                }

                const data: SpriteData = {
                    a_position: this.positions,
                    a_offset: this.offsets,
                    a_pivot: this.pivots,
                    a_scale: this.scales,
                    a_angle: this.angles,
                    a_color: this.colors,
                    a_uvRect: this.uvRects,
                };

                if (this.pipeline) {
                    this.pipeline.bind(gl);
                    this.pipeline.setCamera(
                        gl,
                        this.cameraPos[0],
                        this.cameraPos[1]
                    );
                    this.pipeline.draw(gl, data, count);
                }
            }
        );
    }
}
