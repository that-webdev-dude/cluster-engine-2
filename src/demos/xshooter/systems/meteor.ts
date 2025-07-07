import { UpdateableSystemV2 } from "../../../cluster/ecs/system";
import { CommandBufferV2 } from "../../../cluster/ecs/cmdV2";
import { ViewV2 } from "../../../cluster/ecs/sceneV2";
import { Cmath } from "../../../cluster/tools";
import { Component } from "../components";
import { Renderer } from "../../../cluster/gl/Renderer";
import { meteorArchetype } from "../entities/meteor";

export class MeteorSystem implements UpdateableSystemV2 {
    update(view: ViewV2, cmd: CommandBufferV2, dt: number) {
        view.forEachChunkWith([Component.Meteor], (chunk, chunkId) => {
            const count = chunk.count;
            if (count === 0) return;

            for (let i = 0; i < count; i++) {
                chunk.views.Angle[i] += Cmath.deg2rad(90) * dt;

                const px = chunk.views.Position[i * 2];
                const py = chunk.views.Position[i * 2 + 1];
                const hw = chunk.views.Size[i * 2] / 2;
                const hh = chunk.views.Size[i * 2 + 1] / 2;

                if (
                    px + 8 * hw < 0 ||
                    px - 8 * hw > Renderer.worldWidth() ||
                    py + 8 * hh < 0 ||
                    py - 8 * hh > Renderer.worldHeight()
                ) {
                    let r = (cmd as any).scene.findEntityId(
                        meteorArchetype,
                        chunkId,
                        i
                    );

                    console.log(chunk.count);
                    // console.log(
                    //     " MeteorSystem ~ view.forEachChunkWith ~ r:",
                    //     r
                    // );
                    // const id = chunk.views.EntityId[i];
                    cmd.remove(r[0]);
                }
            }
        });

        // Mouse.update();
    }
}
