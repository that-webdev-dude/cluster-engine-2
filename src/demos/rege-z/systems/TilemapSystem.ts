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
                const { otherMeta } = e.data;
                const otherColor = this.currentView?.getEntityComponent(
                    otherMeta,
                    DESCRIPTORS.Color
                );
                otherColor && (otherColor[1] = 0); // Change player color to red on collision
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
