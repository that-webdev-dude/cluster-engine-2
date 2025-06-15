import { RectPipeline } from "../../gl/pipelines/camRect";
import { RectData } from "../../gl/pipelines/camRectData";
import { Renderer } from "../../gl/Renderer";
import { RenderableSystem } from "../../ecs/system";
import { View } from "../../ecs/scene";
import { Component } from "../components";

export class RendererSystem implements RenderableSystem {
    private cameraPos = [0, 0];
    private interpPos = null as Float32Array | null;
    private renderer = Renderer.getInstance();
    private rectPipeline = new RectPipeline(this.renderer, [
        "Position",
        "Size",
        "Color",
    ]);

    render(view: View, alpha: number) {
        view.forEachChunkWith([Component.Camera], (chunk) => {
            const count = chunk.count;
            if (count > 1)
                console.warn(
                    `[Renderer.Camera]: this view should have 1 record only!`
                );

            // 💥 no camera smooth movement is implemented here
            // need to redefine the archetype
            const i = 0;
            const cur = chunk.views.Position;
            const prev = chunk.views.PreviousPosition;

            this.cameraPos[i * 2] =
                prev[i * 2] + (cur[i * 2] - prev[i * 2]) * alpha;
            this.cameraPos[i * 2 + 1] =
                prev[i * 2 + 1] + (cur[i * 2 + 1] - prev[i * 2 + 1]) * alpha;
        });

        view.forEachChunkWith(
            [Component.Position, Component.Color, Component.Size],
            (chunk) => {
                // dynamic entities have position interpolation
                if (chunk.views.PreviousPosition !== undefined) {
                    const count = chunk.count;
                    if (count === 0) return;

                    // at the first iteration initialize the scratch
                    if (!this.interpPos) {
                        this.interpPos = Float32Array.from(
                            chunk.views.PreviousPosition
                        );
                    }

                    // use alpha to interpolate positions for smooth movement
                    const cur = chunk.views.Position;
                    const prev = chunk.views.PreviousPosition;

                    for (let i = 0; i < count * 2; ++i) {
                        this.interpPos[i] =
                            prev[i] + (cur[i] - prev[i]) * alpha;
                    }

                    // rect data from subarrays
                    const rectData: RectData = {
                        positions: this.interpPos.subarray(0, count * 2),
                        sizes: chunk.views.Size.subarray(0, count * 2),
                        colors: chunk.views.Color.subarray(0, count * 4),
                    };

                    const { gl } = this.renderer;

                    // ❗️ this is the place where we pass in the camera values
                    this.rectPipeline.setCamera(
                        gl,
                        this.cameraPos[0],
                        this.cameraPos[1]
                    );

                    this.rectPipeline.bind(gl);

                    this.rectPipeline.draw(gl, rectData, count);
                } else {
                    // static entities have NOT position interpolation
                    const count = chunk.count;
                    if (count === 0) return;

                    // rect data from subarrays
                    const rectData: RectData = {
                        positions: chunk.views.Position.subarray(0, count * 2),
                        sizes: chunk.views.Size.subarray(0, count * 2),
                        colors: chunk.views.Color.subarray(0, count * 4),
                    };

                    const { gl } = this.renderer;

                    // ❗️ this is the place where we pass in the camera values
                    this.rectPipeline.setCamera(
                        gl,
                        this.cameraPos[0],
                        this.cameraPos[1]
                    );

                    this.rectPipeline.bind(gl);

                    this.rectPipeline.draw(gl, rectData, count);
                }
            }
        );
    }
}
