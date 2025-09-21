// src/renderer/GLRenderer.ts
import { spritesheet } from "../assets";
import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    SizeIndex,
    SpriteIndex,
    OffsetIndex,
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
            ],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                const sizeStride = DESCRIPTORS.Size.count;
                this.scales.set(
                    chunk.views.Size.subarray(0, count * sizeStride),
                    0
                );

                const colorsStride = DESCRIPTORS.Color.count;
                this.colors.set(
                    chunk.views.Color.subarray(0, count * colorsStride),
                    0
                );

                // copy over Angle (radians) instead of zeroes:
                const angleStride = DESCRIPTORS.Angle.count;
                if (chunk.views.Angle) {
                    // if you have PreviousAngle and want interpolation you can do that here
                    this.angles.set(
                        chunk.views.Angle.subarray(0, count * angleStride),
                        0
                    );
                } else {
                    this.angles.fill(0, 0, count);
                }

                // copy Offset (if you intend to use it) or zero:
                const offsetStride = DESCRIPTORS.Offset.count;
                if (chunk.views.Offset) {
                    this.offsets.set(
                        chunk.views.Offset.subarray(0, count * offsetStride),
                        0
                    );
                } else {
                    this.offsets.fill(0);
                }

                // copy Pivot (so your rotation center isn’t always top-left)
                const pivotStride = DESCRIPTORS.Pivot.count;
                if (chunk.views.Pivot) {
                    this.pivots.set(
                        chunk.views.Pivot.subarray(0, count * pivotStride),
                        0
                    );
                } else {
                    this.pivots.fill(0);
                }

                // Dynamic UVs from the Sprite component
                const s = chunk.views.Sprite; // [frameX,frameY,frameW,frameH] in px
                const img = spritesheetImg;

                for (let i = 0; i < count; i++) {
                    const pos = chunk.views.Position;

                    const posBase = i * DESCRIPTORS.Position.count;
                    let posX =
                        pos[posBase + PositionIndex.PREV_X] +
                        (pos[posBase + PositionIndex.X] -
                            pos[posBase + PositionIndex.PREV_X]) *
                            alpha;
                    let posY =
                        pos[posBase + PositionIndex.PREV_Y] +
                        (pos[posBase + PositionIndex.Y] -
                            pos[posBase + PositionIndex.PREV_Y]) *
                            alpha;
                    this.positions[i * 2 + PositionIndex.X] = Math.floor(posX);
                    this.positions[i * 2 + PositionIndex.Y] = Math.floor(posY);

                    const spriteBase = i * DESCRIPTORS.Sprite.count;
                    const fx = s[spriteBase + SpriteIndex.FRAME_X];
                    const fy = s[spriteBase + SpriteIndex.FRAME_Y];
                    const fw = s[spriteBase + SpriteIndex.FRAME_WIDTH];
                    const fh = s[spriteBase + SpriteIndex.FRAME_HEIGHT];

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
