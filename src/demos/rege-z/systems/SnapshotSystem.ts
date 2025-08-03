import { Component } from "../components";
import { View } from "../../../cluster/ecs/scene";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { ECSUpdateSystem } from "../../../cluster/ecs/system";

export class SnapshotSystem extends ECSUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.PreviousPosition, Component.Position],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                const prevPos = chunk.views.PreviousPosition;
                const currPos = chunk.views.Position;

                for (let i = 0; i < count; i++) {
                    prevPos[i * 2 + 0] = currPos[i * 2 + 0];
                    prevPos[i * 2 + 1] = currPos[i * 2 + 1];
                }
            }
        );
    }
}
