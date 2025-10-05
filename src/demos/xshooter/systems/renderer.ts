import { Component } from "../components";
import {
    ECSRenderSystem,
    View,
    Chunk,
    MeshPipeline,
    MeshData,
    Display,
} from "../../../cluster";
import { ComponentDescriptor } from "../../../cluster/types";

export class RendererSystem extends ECSRenderSystem {
    private readonly renderer = Display.getInstance().createGPURenderingLayer();

    private readonly trianglePipe = MeshPipeline.create(this.renderer, 3);
    private readonly hexagonPipe = MeshPipeline.create(this.renderer, 6);

    // cached attributes
    private readonly positions = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private readonly offsets = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private readonly angles = new Float32Array(Chunk.DEFAULT_CAPACITY * 1);
    private readonly pivots = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private readonly sizes = new Float32Array(Chunk.DEFAULT_CAPACITY * 2);
    private readonly colors = new Uint8Array(Chunk.DEFAULT_CAPACITY * 4);

    // cached camera position
    private cameraPos = [0, 0];

    private setPositions(
        chunk: Readonly<Chunk<ComponentDescriptor[]>>,
        alpha: number
    ) {
        const { count } = chunk;
        const prev = chunk.views.PreviousPosition;
        if (prev) {
            for (let i = 0; i < count * 2; i++) {
                this.positions[i] =
                    prev[i] + (chunk.views.Position[i] - prev[i]) * alpha;
            }
        } else {
            this.positions.set(chunk.views.Position.subarray(0, count * 2), 0);
        }
    }

    private setAngles(
        chunk: Readonly<Chunk<ComponentDescriptor[]>>,
        alpha: number
    ) {
        const { count } = chunk;

        const angle = chunk.views.Angle;
        if (angle) {
            /**
             * @warning
             * Interpolation must be performed in degrees here.
             */
            const prevAngle = chunk.views.PreviousAngle;
            if (prevAngle) {
                for (let i = 0; i < count * 1; i++) {
                    this.angles[i] =
                        prevAngle[i] + (angle[i] - prevAngle[i]) * alpha;
                }
            } else {
                this.angles.set(angle.subarray(0, count * 1), 0);
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

    public dispose(): void {
        this.trianglePipe.destroy();
        this.hexagonPipe.destroy();
        this.renderer.destroy();
        this.positions.fill(0);
        this.offsets.fill(0);
        this.angles.fill(0);
        this.pivots.fill(0);
        this.sizes.fill(0);
        this.colors.fill(0);
        this.cameraPos[0] = 0;
        this.cameraPos[1] = 0;
    }
}
