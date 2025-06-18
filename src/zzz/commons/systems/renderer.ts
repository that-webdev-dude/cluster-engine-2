import { RectPipeline, RectData } from "../../gl/pipelines/rect";
import { CirclePipeline, CircleData } from "../../gl/pipelines/circle";
import { Renderer } from "../../gl/Renderer";
import { RenderableSystem } from "../../ecs/system";
import { View } from "../../ecs/scene";
import { Component } from "../components";
import { Chunk } from "../../ecs/chunk";

export class RendererSystem implements RenderableSystem {
    private cameraPos = [0, 0];
    private interpPos = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private renderer = Renderer.getInstance();
    private rectPipe = RectPipeline.create(this.renderer);
    private circlePipe = CirclePipeline.create(this.renderer);

    render(view: View, alpha: number) {
        const gl = this.renderer.gl;

        // Update cameraPos (interpolated)
        view.forEachChunkWith([Component.Camera], (chunk) => {
            const cur = chunk.views.Position;
            const prev = chunk.views.PreviousPosition!;
            // only one camera entity expected
            const i = 0;
            this.cameraPos[0] = prev[0] + (cur[0] - prev[0]) * alpha;
            this.cameraPos[1] = prev[1] + (cur[1] - prev[1]) * alpha;
        });

        // Gather rectangle instances
        view.forEachChunkWith(
            [Component.Position, Component.Size, Component.Color],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                // interpolate positions if needed
                let translations: Float32Array;
                if (chunk.views.PreviousPosition) {
                    for (let i = 0; i < count * 2; i++) {
                        this.interpPos[i] =
                            chunk.views.PreviousPosition![i] +
                            (chunk.views.Position[i] -
                                chunk.views.PreviousPosition![i]) *
                                alpha;
                    }
                    translations = this.interpPos.subarray(0, count * 2);
                } else {
                    translations = chunk.views.Position.subarray(
                        0,
                        count * 2
                    ) as Float32Array;
                }

                // sizes and colors come straight from the chunk
                const scales = chunk.views.Size.subarray(
                    0,
                    count * 2
                ) as Float32Array;
                const colors = chunk.views.Color.subarray(0, count * 4);

                // 3) Build the SoA for this batch
                const data: RectData = {
                    a_translation: translations,
                    a_scale: scales,
                    a_color: new Uint8Array(
                        colors.buffer,
                        colors.byteOffset,
                        colors.byteLength
                    ),
                };

                // 4) Issue one instanced draw
                this.rectPipe.bind(gl);
                this.rectPipe.setCamera(
                    gl,
                    this.cameraPos[0],
                    this.cameraPos[1]
                );
                this.rectPipe.draw(gl, data, count);
            }
        );

        // Gather rectangle instances
        view.forEachChunkWith(
            [Component.Position, Component.Radius, Component.Color],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                // interpolate positions if needed
                let translations: Float32Array;
                if (chunk.views.PreviousPosition) {
                    for (let i = 0; i < count * 2; i++) {
                        this.interpPos[i] =
                            chunk.views.PreviousPosition![i] +
                            (chunk.views.Position[i] -
                                chunk.views.PreviousPosition![i]) *
                                alpha;
                    }
                    translations = this.interpPos.subarray(0, count * 2);
                } else {
                    translations = chunk.views.Position.subarray(
                        0,
                        count * 2
                    ) as Float32Array;
                }

                // sizes and colors come straight from the chunk
                const scales = chunk.views.Radius.subarray(
                    0,
                    count * 1
                ) as Float32Array;
                const colors = chunk.views.Color.subarray(0, count * 4);

                // 3) Build the SoA for this batch
                const data: RectData = {
                    a_translation: translations,
                    a_scale: scales,
                    a_color: new Uint8Array(
                        colors.buffer,
                        colors.byteOffset,
                        colors.byteLength
                    ),
                };

                // 4) Issue one instanced draw
                this.circlePipe.bind(gl);
                this.circlePipe.setCamera(
                    gl,
                    this.cameraPos[0],
                    this.cameraPos[1]
                );
                this.circlePipe.draw(gl, data, count);
            }
        );
    }
}
