import { UpdateableSystemV2 } from "../../../cluster/ecs/system";
import { CommandBufferV2 } from "../../../cluster/ecs/cmdV2";
import { ViewV2 } from "../../../cluster/ecs/sceneV2";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";

export class PlayerSystem implements UpdateableSystemV2 {
    update(view: ViewV2, cmd: CommandBufferV2, dt: number) {
        view.forEachChunkWith([Component.Player], (chunk) => {
            // only one player is expected
            if (chunk.count > 1) {
                console.warn(
                    `[PlayerSystem]: more than one player is not allowed`
                );
            }

            for (let i = 0; i < chunk.count; i++) {
                const px = chunk.views.Position[i * 2];
                const py = chunk.views.Position[i * 2 + 1];

                const mx = Mouse.virtualPosition.x;
                const my = Mouse.virtualPosition.y;

                chunk.views.Angle[i] = Cmath.angle(px, py, mx, my) + Math.PI;
            }
        });

        Mouse.update();
    }
}
