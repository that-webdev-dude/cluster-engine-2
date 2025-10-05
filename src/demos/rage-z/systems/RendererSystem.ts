// src/renderer/GLRenderer.ts
import { spritesheet } from "../assets";
import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    SizeIndex,
    SpriteIndex,
    OffsetIndex,
    ColorIndex,
    PivotIndex,
    AngleIndex,
    VisibilityIndex,
} from "../components";
import {
    Display,
    View,
    Chunk,
    Store,
    SpriteData,
    SpritePipeline,
    ECSRenderSystem,
} from "../../../cluster";

const chunkSize = Chunk.DEFAULT_CAPACITY;

export class SpriteRendererSystem extends ECSRenderSystem {
    private readonly renderer = Display.getInstance().createGPURenderingLayer();
    private pipeline: SpritePipeline | null = null;

    // per-instance SoA buffers, size = chunkSize
    private readonly positions = new Float32Array(chunkSize * 2);
    private readonly offsets = new Float32Array(chunkSize * 2);
    private readonly pivots = new Float32Array(chunkSize * 2);
    private readonly scales = new Float32Array(chunkSize * 2);
    private readonly angles = new Float32Array(chunkSize * 1);
    private readonly colors = new Uint8Array(chunkSize * 4);
    private readonly uvRects = new Float32Array(chunkSize * 4);

    private cameraPos: [number, number] = [0, 0];

    constructor(store: Store) {
        super(store);
    }

    render(view: View, alpha: number) {
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
            const pos = chunk.views.Position;
            const off = chunk.views.Offset;
            const size = chunk.views.Size;

            const interpolatedX =
                pos[PositionIndex.PREV_X] +
                (pos[PositionIndex.X] - pos[PositionIndex.PREV_X]) * alpha;
            const interpolatedY =
                pos[PositionIndex.PREV_Y] +
                (pos[PositionIndex.Y] - pos[PositionIndex.PREV_Y]) * alpha;

            // should I now center the camera?
            this.cameraPos[PositionIndex.X] = Math.round(
                interpolatedX - size[SizeIndex.WIDTH] * 0.5 + off[OffsetIndex.X]
            );
            this.cameraPos[PositionIndex.Y] = Math.round(
                interpolatedY -
                    size[SizeIndex.HEIGHT] * 0.5 +
                    off[OffsetIndex.Y]
            );
        });

        // (2) draw all entities with a Sprite component
        view.forEachChunkWith(
            [
                Component.Sprite,
                Component.Position,
                Component.Color,
                Component.Size,
                Component.Visibility,
            ],
            (chunk) => {
                this.renderSpriteChunk(chunk, alpha, spritesheetImg);
            }
        );
    }

    private renderSpriteChunk(
        chunk: Readonly<Chunk<any>>,
        alpha: number,
        spritesheetImg: HTMLImageElement
    ): void {
        const count = chunk.count;
        if (!count) return;

        const gl = this.renderer.gl;

        const vis = chunk.views.Visibility;
        const pos = chunk.views.Position;
        const size = chunk.views.Size;
        const color = chunk.views.Color;
        const sprite = chunk.views.Sprite;
        const angle = chunk.views.Angle;
        const offset = chunk.views.Offset;
        const pivot = chunk.views.Pivot;

        const posStride = DESCRIPTORS.Position.count;
        const sizeStride = DESCRIPTORS.Size.count;
        const colorStride = DESCRIPTORS.Color.count;
        const spriteStride = DESCRIPTORS.Sprite.count;
        const angleStride = DESCRIPTORS.Angle.count;
        const offsetStride = DESCRIPTORS.Offset.count;
        const pivotStride = DESCRIPTORS.Pivot.count;
        const visStride = DESCRIPTORS.Visibility.count;

        let out = 0;
        for (let i = 0; i < count; i++) {
            if (vis && vis[i * visStride + VisibilityIndex.VISIBLE] === 0) {
                continue;
            }

            const dest2 = out * 2;
            const dest4 = out * 4;

            this.copyPosition(pos, i, posStride, dest2, alpha);
            this.copySize(size, i, sizeStride, dest2);
            this.copyColor(color, i, colorStride, dest4);
            this.copyAngle(angle, i, angleStride, out);
            this.copyOffset(offset, i, offsetStride, dest2);
            this.copyPivot(pivot, i, pivotStride, dest2);
            this.copyUV(sprite, i, spriteStride, dest4, spritesheetImg);

            out++;
        }

        if (out === 0 || !this.pipeline) return;

        const data: SpriteData = {
            a_position: this.positions,
            a_offset: this.offsets,
            a_pivot: this.pivots,
            a_scale: this.scales,
            a_angle: this.angles,
            a_color: this.colors,
            a_uvRect: this.uvRects,
        };

        this.pipeline.bind(gl);
        this.pipeline.setCamera(gl, this.cameraPos[0], this.cameraPos[1]);
        this.pipeline.draw(gl, data, out);
    }

    private copyPosition(
        pos: Float32Array,
        index: number,
        stride: number,
        dest2: number,
        alpha: number
    ): void {
        const posBase = index * stride;
        const interpX =
            pos[posBase + PositionIndex.PREV_X] +
            (pos[posBase + PositionIndex.X] -
                pos[posBase + PositionIndex.PREV_X]) *
                alpha;
        const interpY =
            pos[posBase + PositionIndex.PREV_Y] +
            (pos[posBase + PositionIndex.Y] -
                pos[posBase + PositionIndex.PREV_Y]) *
                alpha;

        this.positions[dest2 + PositionIndex.X] = Math.floor(interpX);
        this.positions[dest2 + PositionIndex.Y] = Math.floor(interpY);
    }

    private copySize(
        size: Float32Array,
        index: number,
        stride: number,
        dest2: number
    ): void {
        const base = index * stride;
        this.scales[dest2 + SizeIndex.WIDTH] = size[base + SizeIndex.WIDTH];
        this.scales[dest2 + SizeIndex.HEIGHT] = size[base + SizeIndex.HEIGHT];
    }

    private copyColor(
        color: Uint8Array,
        index: number,
        stride: number,
        dest4: number
    ): void {
        const base = index * stride;
        this.colors[dest4 + ColorIndex.R] = color[base + ColorIndex.R];
        this.colors[dest4 + ColorIndex.G] = color[base + ColorIndex.G];
        this.colors[dest4 + ColorIndex.B] = color[base + ColorIndex.B];
        this.colors[dest4 + ColorIndex.A] = color[base + ColorIndex.A];
    }

    private copyAngle(
        angle: Float32Array | undefined,
        index: number,
        stride: number,
        dest: number
    ): void {
        if (!angle) {
            this.angles[dest] = 0;
            return;
        }
        this.angles[dest] = angle[index * stride + AngleIndex.RADIANS];
    }

    private copyOffset(
        offset: Float32Array | undefined,
        index: number,
        stride: number,
        dest2: number
    ): void {
        if (!offset) {
            this.offsets[dest2 + OffsetIndex.X] = 0;
            this.offsets[dest2 + OffsetIndex.Y] = 0;
            return;
        }
        const base = index * stride;
        this.offsets[dest2 + OffsetIndex.X] = offset[base + OffsetIndex.X];
        this.offsets[dest2 + OffsetIndex.Y] = offset[base + OffsetIndex.Y];
    }

    private copyPivot(
        pivot: Float32Array | undefined,
        index: number,
        stride: number,
        dest2: number
    ): void {
        if (!pivot) {
            this.pivots[dest2 + PivotIndex.X] = 0;
            this.pivots[dest2 + PivotIndex.Y] = 0;
            return;
        }
        const base = index * stride;
        this.pivots[dest2 + PivotIndex.X] = pivot[base + PivotIndex.X];
        this.pivots[dest2 + PivotIndex.Y] = pivot[base + PivotIndex.Y];
    }

    private copyUV(
        sprite: Float32Array,
        index: number,
        stride: number,
        dest4: number,
        img: HTMLImageElement
    ): void {
        const base = index * stride;
        const fx = sprite[base + SpriteIndex.FRAME_X];
        const fy = sprite[base + SpriteIndex.FRAME_Y];
        const fw = sprite[base + SpriteIndex.FRAME_WIDTH];
        const fh = sprite[base + SpriteIndex.FRAME_HEIGHT];

        this.uvRects[dest4 + 0] = fx / img.width;
        this.uvRects[dest4 + 1] = fy / img.height;
        this.uvRects[dest4 + 2] = (fx + fw) / img.width;
        this.uvRects[dest4 + 3] = (fy + fh) / img.height;
    }

    public dispose(): void {
        this.pipeline?.destroy();
        this.pipeline = null;
        this.positions.fill(0);
        this.offsets.fill(0);
        this.pivots.fill(0);
        this.scales.fill(0);
        this.angles.fill(0);
        this.colors.fill(0);
        this.uvRects.fill(0);
        this.cameraPos[0] = 0;
        this.cameraPos[1] = 0;
    }
}
