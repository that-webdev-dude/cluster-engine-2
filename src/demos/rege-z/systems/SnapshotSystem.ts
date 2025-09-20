import { Component, DESCRIPTORS, PositionIndex } from "../components";
import { View } from "../../../cluster";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { ECSUpdateSystem } from "../../../cluster/ecs/system";

export class SnapshotSystem extends ECSUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith([Component.Position], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            const pos = chunk.views.Position;

            for (let i = 0; i < count; i++) {
                const base = i * DESCRIPTORS.Position.count;
                pos[base + PositionIndex.PREV_X] = pos[base + PositionIndex.X];
                pos[base + PositionIndex.PREV_Y] = pos[base + PositionIndex.Y];
            }
        });
    }
}
