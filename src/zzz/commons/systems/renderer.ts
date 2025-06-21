import { RectPipeline, RectData } from "../../gl/pipelines/rrect";
import { CirclePipeline, CircleData } from "../../gl/pipelines/circle";
import { Renderer } from "../../gl/Renderer";
import { RenderableSystem } from "../../ecs/system";
import { View } from "../../ecs/scene";
import { Component, DESCRIPTORS } from "../components";
import { Chunk } from "../../ecs/chunk";

export class RendererSystem implements RenderableSystem {
    private renderer = Renderer.getInstance();
    private rectPipe = RectPipeline.create(this.renderer);
    private circlePipe = CirclePipeline.create(this.renderer);

    // cached attributes
    private translations = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private angles = new Float32Array(Chunk.DEFAULT_CAPACITY * 1);
    private pivots = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private radii = new Float32Array(Chunk.DEFAULT_CAPACITY * 1);
    private sizes = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private colors = new Uint8Array(Chunk.DEFAULT_CAPACITY * 4);

    // cached camera position
    private cameraPos = [0, 0];

    private setTranslations(
        chunk: Readonly<Chunk<typeof DESCRIPTORS>>,
        alpha: number
    ) {
        const { count } = chunk;
        if (chunk.views.PreviousPosition) {
            for (let i = 0; i < count * 2; i++) {
                this.translations[i] =
                    chunk.views.PreviousPosition![i] +
                    (chunk.views.Position[i] -
                        chunk.views.PreviousPosition![i]) *
                        alpha;
            }
        } else {
            this.translations.set(
                chunk.views.Position.subarray(0, count * 2),
                0
            );
        }
    }

    private setAngles(
        chunk: Readonly<Chunk<typeof DESCRIPTORS>>,
        alpha: number
    ) {
        const { count } = chunk;

        if (chunk.views.Angle) {
            /**
             * @warning
             * Interpolation must be performed in degrees here.
             */
            if (chunk.views.PreviousAngle) {
                for (let i = 0; i < count * 1; i++) {
                    this.angles[i] =
                        chunk.views.PreviousAngle![i] +
                        (chunk.views.Angle[i] - chunk.views.PreviousAngle![i]) *
                            alpha;
                }
            } else {
                this.angles.set(chunk.views.Angle.subarray(0, count * 1), 0);
            }
        } else {
            this.angles.fill(0, 0, count);
        }
    }

    private setPivots(chunk: Readonly<Chunk<typeof DESCRIPTORS>>) {
        const { count } = chunk;

        chunk.views.Pivot
            ? this.pivots.set(chunk.views.Pivot.subarray(0, count * 1), 0)
            : this.pivots.fill(0, 0, count);
    }

    private setRadii(chunk: Readonly<Chunk<typeof DESCRIPTORS>>) {
        const { count } = chunk;
        this.radii.set(chunk.views.Radius.subarray(0, count * 1), 0);
    }

    private setSizes(chunk: Readonly<Chunk<typeof DESCRIPTORS>>) {
        const { count } = chunk;
        this.sizes.set(chunk.views.Size.subarray(0, count * 2), 0);
    }

    private setColors(chunk: Readonly<Chunk<typeof DESCRIPTORS>>) {
        const { count } = chunk;
        this.colors.set(chunk.views.Color.subarray(0, count * 4), 0);
    }

    private setRectData(): RectData {
        return {
            a_translation: this.translations,
            a_rotation: this.angles,
            a_pivot: this.pivots,
            a_scale: this.sizes,
            a_color: this.colors,
        };
    }

    private setCircleData(): CircleData {
        return {
            a_translation: this.translations,
            a_scale: this.radii,
            a_color: this.colors,
        };
    }

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

        // render rectangle shapes
        view.forEachChunkWith(
            [Component.Position, Component.Size, Component.Color],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                this.setTranslations(chunk, alpha);
                this.setAngles(chunk, alpha);
                this.setSizes(chunk);
                this.setColors(chunk);
                this.setPivots(chunk);

                // Build the SoA for this batch
                const data = this.setRectData();

                // Issue one instanced draw
                this.rectPipe.bind(gl);
                this.rectPipe.setCamera(
                    gl,
                    this.cameraPos[0],
                    this.cameraPos[1]
                );
                this.rectPipe.draw(gl, data, count);
            }
        );

        // render circle shapes
        view.forEachChunkWith(
            [Component.Position, Component.Radius, Component.Color],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                this.setTranslations(chunk, alpha);
                this.setRadii(chunk);
                this.setColors(chunk);

                // Build the SoA for this batch
                const data = this.setCircleData();

                // Issue one instanced draw
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
