import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    SizeIndex,
    OffsetIndex,
    CameraIndex,
    VisibilityIndex,
    AABBIndex,
} from "../components";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { ECSUpdateSystem } from "../../../cluster/ecs/system";
import { DebugOverlay } from "../../../cluster";
import type { Store, View, Chunk } from "../../../cluster";

interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

const DEBUG_OVERLAY = true;

/**
 * Marks entities as visible when they intersect the active camera rectangle.
 */
export class CullingSystem extends ECSUpdateSystem {
    private readonly displayW: number;
    private readonly displayH: number;
    private db: DebugOverlay | undefined;

    constructor(store: Store, private readonly margin = 64) {
        super(store);
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");

        if (DEBUG_OVERLAY) {
            this.db = new DebugOverlay(
                this.displayW || 0,
                this.displayH || 0,
                320,
                true
            );
        }
    }

    update(view: View, _cmd: CommandBuffer, _dt: number): void {
        const expanded = this.getExpandedCameraRect(view);
        if (!expanded) {
            this.renderDebugOverlay(0, 0, undefined);
            return;
        }

        let totalEntities = 0;
        let visibleEntities = 0;

        view.forEachChunkWith(
            [Component.Visibility, Component.Position],
            (chunk) => {
                const { total, visible } = this.cullChunk(chunk, expanded);
                totalEntities += total;
                visibleEntities += visible;
            }
        );

        this.renderDebugOverlay(visibleEntities, totalEntities, expanded);
    }

    private getExpandedCameraRect(view: View): Rect | undefined {
        const baseRect = this.getCameraRect(view) ?? this.getFallbackRect();
        if (!baseRect) return undefined;
        return {
            left: baseRect.left - this.margin,
            top: baseRect.top - this.margin,
            right: baseRect.right + this.margin,
            bottom: baseRect.bottom + this.margin,
        };
    }

    private cullChunk(
        chunk: Readonly<Chunk<any>>,
        rect: Rect
    ): {
        total: number;
        visible: number;
    } {
        const count = chunk.count;
        if (!count) return { total: 0, visible: 0 };

        const vis = chunk.views.Visibility;
        const pos = chunk.views.Position;
        const size = chunk.views.Size;
        const off = chunk.views.Offset;
        const aabb = chunk.views.AABB;

        const visStride = DESCRIPTORS.Visibility.count;
        if (!vis) return { total: 0, visible: 0 };

        let visibleCount = 0;

        for (let i = 0; i < count; i++) {
            const visBase = i * visStride + VisibilityIndex.VISIBLE;
            const bounds = this.getEntityBounds(i, pos, size, off, aabb);

            const visible =
                bounds.maxX >= rect.left &&
                bounds.minX <= rect.right &&
                bounds.maxY >= rect.top &&
                bounds.minY <= rect.bottom;

            vis[visBase] = visible ? 1 : 0;
            if (visible) visibleCount++;
        }

        return {
            total: count,
            visible: visibleCount,
        };
    }

    private getEntityBounds(
        index: number,
        pos: Float32Array,
        size: Float32Array | undefined,
        off: Float32Array | undefined,
        aabb: Float32Array | undefined
    ): Bounds {
        if (aabb) {
            const base = index * DESCRIPTORS.AABB.count;
            return {
                minX: aabb[base + AABBIndex.MIN_X],
                minY: aabb[base + AABBIndex.MIN_Y],
                maxX: aabb[base + AABBIndex.MAX_X],
                maxY: aabb[base + AABBIndex.MAX_Y],
            };
        }

        const posBase = index * DESCRIPTORS.Position.count;
        const cx = pos[posBase + PositionIndex.X];
        const cy = pos[posBase + PositionIndex.Y];
        const halfW = size
            ? size[index * DESCRIPTORS.Size.count + SizeIndex.WIDTH] * 0.5
            : 0;
        const halfH = size
            ? size[index * DESCRIPTORS.Size.count + SizeIndex.HEIGHT] * 0.5
            : 0;
        const offsetX = off
            ? off[index * DESCRIPTORS.Offset.count + OffsetIndex.X]
            : 0;
        const offsetY = off
            ? off[index * DESCRIPTORS.Offset.count + OffsetIndex.Y]
            : 0;

        return {
            minX: cx - halfW + offsetX,
            minY: cy - halfH + offsetY,
            maxX: cx + halfW + offsetX,
            maxY: cy + halfH + offsetY,
        };
    }

    private getCameraRect(view: View): Rect | undefined {
        const camStride = DESCRIPTORS.Camera.count;
        const posStride = DESCRIPTORS.Position.count;
        const sizeStride = DESCRIPTORS.Size.count;
        const offStride = DESCRIPTORS.Offset.count;

        let rect: Rect | undefined;
        let found = false;

        view.forEachChunkWith(
            [Component.Camera, Component.Position, Component.Size],
            (chunk) => {
                if (found) return;
                const camera = chunk.views.Camera;
                const pos = chunk.views.Position;
                const size = chunk.views.Size;
                const off = chunk.views.Offset;

                for (let i = 0; i < chunk.count; i++) {
                    const camBase = i * camStride;
                    if (camera[camBase + CameraIndex.ENABLED] === 0) continue;

                    const posBase = i * posStride;
                    const sizeBase = i * sizeStride;
                    const offBase = off ? i * offStride : 0;

                    const cx = pos[posBase + PositionIndex.X];
                    const cy = pos[posBase + PositionIndex.Y];
                    const width = size[sizeBase + SizeIndex.WIDTH];
                    const height = size[sizeBase + SizeIndex.HEIGHT];

                    const offX = off ? off[offBase + OffsetIndex.X] : 0;
                    const offY = off ? off[offBase + OffsetIndex.Y] : 0;

                    const left = cx - width * 0.5 + offX;
                    const top = cy - height * 0.5 + offY;

                    rect = {
                        left,
                        top,
                        right: left + width,
                        bottom: top + height,
                    };
                    found = true;
                    break;
                }
            }
        );

        return rect;
    }

    private getFallbackRect(): Rect | undefined {
        if (!this.displayW || !this.displayH) return undefined;
        return {
            left: 0,
            top: 0,
            right: this.displayW,
            bottom: this.displayH,
        };
    }

    private renderDebugOverlay(
        visible: number,
        total: number,
        rect: Rect | undefined
    ): void {
        if (!DEBUG_OVERLAY || !this.db?.enabled) return;

        this.db.clear();

        const percent = total > 0 ? (visible / total) * 100 : 0;
        const fontSmall = "12px monospace";
        const fontLarge = "14px monospace";

        this.db.text("Visibility Culling", 12, 18, fontLarge, "#7CFC00");
        this.db.text(
            `Visible: ${visible} / ${total} (${percent.toFixed(1)}%)`,
            12,
            36,
            fontSmall,
            "#FFFFFF"
        );

        if (rect) {
            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;
            this.db.text(
                `Camera: (${rect.left.toFixed(1)}, ${rect.top.toFixed(1)})` +
                    ` w=${width.toFixed(1)} h=${height.toFixed(1)}`,
                12,
                52,
                fontSmall,
                "#FFFFFF"
            );
            this.db.text(
                `Margin: ${this.margin}`,
                12,
                68,
                fontSmall,
                "#AAAAAA"
            );
        } else {
            this.db.text("Camera: unavailable", 12, 52, fontSmall, "#FF8888");
        }
    }

    public dispose(): void {
        this.db?.dispose();
        this.db = undefined;
    }
}
