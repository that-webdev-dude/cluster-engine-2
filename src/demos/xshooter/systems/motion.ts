import { ECSUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster";
import { Component } from "../components";

export class MotionSystem extends ECSUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [
                Component.PreviousPosition,
                Component.Position,
                Component.Velocity,
            ],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                for (let i = 0; i < count; i++) {
                    chunk.views.PreviousPosition[i * 2] =
                        chunk.views.Position[i * 2];
                    chunk.views.PreviousPosition[i * 2 + 1] =
                        chunk.views.Position[i * 2 + 1];

                    chunk.views.Position[i * 2] +=
                        chunk.views.Velocity[i * 2] * dt;
                    chunk.views.Position[i * 2 + 1] +=
                        chunk.views.Velocity[i * 2 + 1] * dt;
                }
            }
        );
    }

    public dispose(): void {
        // stateless system
    }
}
