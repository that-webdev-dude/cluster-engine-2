import { Component, DESCRIPTORS } from "../components";
import { View } from "../../../cluster";
import { Store } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { ECSUpdateSystem } from "../../../cluster";
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
                    arr[base + 1] = 0;
                }

                const otherMetaS = e.data.secondary?.otherMeta;
                if (otherMetaS === undefined) return;
                slice = this.currentView?.getSlice(
                    otherMetaS,
                    DESCRIPTORS.Color
                );
                if (slice !== undefined) {
                    const { arr, base } = slice;
                    arr[base + 2] = 0;
                }

                const otherMetaT = e.data.tertiary?.otherMeta;
                if (otherMetaT === undefined) return;
                slice = this.currentView?.getSlice(
                    otherMetaT,
                    DESCRIPTORS.Color
                );
                if (slice !== undefined) {
                    const { arr, base } = slice;
                    arr[base + 3] = 0;
                }
            },
            false
        );
    }
    update(view: View, cmd: CommandBuffer, dt: number) {
        // cache the view for this update cycle
        this.currentView = view;

        view.forEachChunkWith([Component.Wall], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            if (chunk.views.Wall[0] !== 1) return; // Ensure this is the player entity

            for (let i = 0; i < count; i++) {
                const col = chunk.views.Color;

                // reset the color each frame
                col[i * 4 + 0] = 255; // R
                col[i * 4 + 1] = 255; // G
                col[i * 4 + 2] = 255; // B
                col[i * 4 + 3] = 255; // A
            }
        });
    }
}
