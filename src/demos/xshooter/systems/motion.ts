import { UpdateableSystemV2 } from "../../../cluster/ecs/system";
import { CommandBufferV2 } from "../../../cluster/ecs/cmdV2";
import { ViewV2 } from "../../../cluster/ecs/sceneV2";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";

export class MotionSystem implements UpdateableSystemV2 {
    update(view: ViewV2, cmd: CommandBufferV2, dt: number) {
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

        // Mouse.update();
    }
}
