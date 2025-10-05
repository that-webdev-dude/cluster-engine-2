import { View, Store, CommandBuffer, ECSUpdateSystem } from "../../../cluster";
import {
    Component,
    DESCRIPTORS,
    ColorIndex,
    VisibilityIndex,
} from "../components";
import { CollisionEvent } from "../events";

export class TilemapSystem extends ECSUpdateSystem {
    private currentView: View | undefined = undefined;

    constructor(readonly store: Store) {
        super(store);

        store.on<CollisionEvent>(
            "player-wall-collision",
            (e) => {
                const otherMetaP = e.data.primary?.otherMeta;
                if (otherMetaP === undefined) return;
                let slice = this.currentView?.getSlice(
                    otherMetaP,
                    DESCRIPTORS.Color
                );
                if (slice !== undefined) {
                    const { arr, base } = slice;
                    arr[base + ColorIndex.R] = 0;
                }

                const otherMetaS = e.data.secondary?.otherMeta;
                if (otherMetaS === undefined) return;
                slice = this.currentView?.getSlice(
                    otherMetaS,
                    DESCRIPTORS.Color
                );
                if (slice !== undefined) {
                    const { arr, base } = slice;
                    arr[base + ColorIndex.G] = 0;
                }

                const otherMetaT = e.data.tertiary?.otherMeta;
                if (otherMetaT === undefined) return;
                slice = this.currentView?.getSlice(
                    otherMetaT,
                    DESCRIPTORS.Color
                );
                if (slice !== undefined) {
                    const { arr, base } = slice;
                    arr[base + ColorIndex.B] = 0;
                }
            },
            false
        );
    }
    update(view: View, cmd: CommandBuffer, dt: number) {
        // cache the view for this update cycle
        this.currentView = view;

        view.forEachChunkWith(
            [Component.Wall, Component.Visibility],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                if (chunk.views.Wall[0] !== 1) return; // Ensure this is the player entity

                const colStride = DESCRIPTORS.Color.count;
                const vis = chunk.views.Visibility;
                const visStride = DESCRIPTORS.Visibility.count;
                for (let i = 0; i < count; i++) {
                    if (
                        vis &&
                        vis[i * visStride + VisibilityIndex.VISIBLE] === 0
                    ) {
                        continue;
                    }
                    const col = chunk.views.Color;

                    // reset the color each frame
                    col[i * colStride + ColorIndex.R] = 255;
                    col[i * colStride + ColorIndex.G] = 255;
                    col[i * colStride + ColorIndex.B] = 255;
                    col[i * colStride + ColorIndex.A] = 255;
                }
            }
        );
    }
}
