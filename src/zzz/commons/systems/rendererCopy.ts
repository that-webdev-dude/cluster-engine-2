import { RectPipeline } from "../../gl/pipelines/rect";
import { RectData } from "../../gl/pipelines/rectData";
import { Renderer } from "../../gl/Renderer";
import { RenderableSystem } from "../../ecs/system";
// import { View } from "../../ecs/world";
import { View } from "../../ecs/scene";
import { Component } from "../components";

export class RendererSystem implements RenderableSystem {
    private interpPos = null as Float32Array | null;
    private renderer = Renderer.getInstance();
    private rectPipeline = new RectPipeline(this.renderer, [
        "Position",
        "Size",
        "Color",
    ]);

    render(view: View, alpha: number) {
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

                    this.rectPipeline.bind(gl);

                    this.rectPipeline.draw(gl, rectData, count);
                }
            }
        );
    }
}
