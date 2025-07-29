// src/renderer/GLRenderer.ts

import { charactersImg } from "../assets";
import { Component } from "../components";
import { Display } from "../../../cluster";
import { View } from "../../../cluster";
import { Chunk } from "../../../cluster";
import { SpriteData } from "../../../cluster";
import { SpritePipeline } from "../../../cluster";
import { StorageRenderSystem } from "../../../cluster";

export class SpriteRendererSystem extends StorageRenderSystem {
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

        // — lazy init pipeline
        if (!this.pipeline) {
            if (charactersImg.complete && charactersImg.naturalWidth > 0) {
                this.pipeline = SpritePipeline.create(
                    this.renderer,
                    charactersImg
                );
            }
        }
        if (!this.pipeline) return;

        // (1) update your camera if you have one
        view.forEachChunkWith([Component.Position /*, Camera*/], (chunk) => {
            // example: lock camera at origin
            this.cameraPos[0] = 0;
            this.cameraPos[1] = 0;
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

                // copy over Position, Size, Color
                // prettier-ignore
                this.positions.set(chunk.views.Position.subarray(0, count * 2), 0);
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
                const img = charactersImg;

                for (let i = 0; i < count; i++) {
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
