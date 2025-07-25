import { Component } from "../components";
import { StorageRenderSystem } from "../../../cluster/ecs/system";
import { View } from "../../../cluster/ecs/scene";
import { Chunk } from "../../../cluster/ecs/chunk";
import { MeshPipeline, MeshData } from "../../../cluster/gl/pipelines/mesh";
import { ComponentDescriptor } from "../../../cluster/types";
import { Display } from "../../../cluster/core/Display";

export class RendererSystem extends StorageRenderSystem {
    private renderer = Display.getInstance().createGPURenderingLayer();

    private trianglePipe = MeshPipeline.create(this.renderer, 3);
    private hexagonPipe = MeshPipeline.create(this.renderer, 6);

    // cached attributes
    private positions = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private offsets = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private angles = new Float32Array(Chunk.DEFAULT_CAPACITY * 1);
    private pivots = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private sizes = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private colors = new Uint8Array(Chunk.DEFAULT_CAPACITY * 4);

    // cached camera position
    private cameraPos = [0, 0];

    private setPositions(
        chunk: Readonly<Chunk<ComponentDescriptor[]>>,
        alpha: number
    ) {
        const { count } = chunk;
        if (chunk.views.PreviousPosition) {
            for (let i = 0; i < count * 2; i++) {
                this.positions[i] =
                    chunk.views.PreviousPosition![i] +
                    (chunk.views.Position[i] -
                        chunk.views.PreviousPosition![i]) *
                        alpha;
            }
        } else {
            // chunk.full
            //     ? (this.positions = chunk.views.Position as Float32Array)
            //     : this.positions.set(
            //           chunk.views.Position.subarray(0, count * 2),
            //           0
            //       );

            // chunk.views.Position.subarray(0, count * 2);
            this.positions.set(chunk.views.Position.subarray(0, count * 2), 0);
        }
    }

    private setAngles(
        chunk: Readonly<Chunk<ComponentDescriptor[]>>,
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

    private setPivots(chunk: Readonly<Chunk<ComponentDescriptor[]>>) {
        const { count } = chunk;

        chunk.views.Pivot
            ? this.pivots.set(chunk.views.Pivot.subarray(0, count * 1), 0)
            : this.pivots.fill(0, 0, count);
    }

    private setSizes(chunk: Readonly<Chunk<ComponentDescriptor[]>>) {
        const { count } = chunk;
        this.sizes.set(chunk.views.Size.subarray(0, count * 2), 0);
    }

    private setOffsets(chunk: Readonly<Chunk<ComponentDescriptor[]>>) {
        const { count } = chunk;
        this.offsets.set(chunk.views.Offset.subarray(0, count * 2), 0);
    }

    private setColors(chunk: Readonly<Chunk<ComponentDescriptor[]>>) {
        const { count } = chunk;
        this.colors.set(chunk.views.Color.subarray(0, count * 4), 0);
    }

    private setMeshData(): MeshData {
        return {
            a_position: this.positions,
            a_offset: this.offsets,
            a_angle: this.angles,
            a_pivot: this.pivots,
            a_scale: this.sizes,
            a_color: this.colors,
        };
    }

    render(view: View, alpha: number) {
        const gl = this.renderer.gl;

        // Update cameraPos (interpolated)
        view.forEachChunkWith([Component.Camera], (chunk) => {
            const cur = chunk.views.Position;
            const prev = chunk.views.PreviousPosition!;

            const interpolatedX = prev[0] + (cur[0] - prev[0]) * alpha;
            const interpolatedY = prev[1] + (cur[1] - prev[1]) * alpha;

            this.cameraPos[0] = interpolatedX + 0;
            this.cameraPos[1] = interpolatedY + 0;
        });

        // render the player
        view.forEachChunkWith([Component.Player], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            // ⚠️ add the whole chunk if chunk is full instead of subarrays
            this.setPositions(chunk, alpha);
            this.setAngles(chunk, alpha);
            this.setOffsets(chunk);
            this.setColors(chunk);
            this.setSizes(chunk);
            this.setPivots(chunk);

            // Build the SoA for this batch
            const data = this.setMeshData();

            // Issue one instanced draw
            this.trianglePipe.bind(gl);
            this.trianglePipe.setCamera(
                gl,
                this.cameraPos[0],
                this.cameraPos[1]
            );
            this.trianglePipe.draw(gl, data, count);
        });

        view.forEachChunkWith([Component.Meteor], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            this.setPositions(chunk, alpha);
            this.setAngles(chunk, alpha);
            this.setOffsets(chunk);
            this.setColors(chunk);
            this.setSizes(chunk);
            this.setPivots(chunk);

            // Build the SoA for this batch
            const data = this.setMeshData();

            // Issue one instanced draw
            this.hexagonPipe.bind(gl);
            this.hexagonPipe.setCamera(
                gl,
                this.cameraPos[0],
                this.cameraPos[1]
            );
            this.hexagonPipe.draw(gl, data, count);
        });

        view.forEachChunkWith([Component.Bullet], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            this.setPositions(chunk, alpha);
            this.setAngles(chunk, alpha);
            this.setOffsets(chunk);
            this.setColors(chunk);
            this.setSizes(chunk);
            this.setPivots(chunk);

            // Build the SoA for this batch
            const data = this.setMeshData();

            // Issue one instanced draw
            this.hexagonPipe.bind(gl);
            this.hexagonPipe.setCamera(
                gl,
                this.cameraPos[0],
                this.cameraPos[1]
            );
            this.hexagonPipe.draw(gl, data, count);
        });
    }
}
