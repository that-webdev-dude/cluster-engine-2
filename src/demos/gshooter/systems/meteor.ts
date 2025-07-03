import { UpdateableSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";
import { Renderer } from "../../../cluster/gl/Renderer";

export class MeteorSystem implements UpdateableSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith([Component.Meteor], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            for (let i = 0; i < count; i++) {
                chunk.views.Angle[i] += Cmath.deg2rad(90) * dt;

                const px = chunk.views.Position[i * 2];
                const py = chunk.views.Position[i * 2 + 1];
                const hw = chunk.views.Size[i * 2] / 2;
                const hh = chunk.views.Size[i * 2 + 1] / 2;

                if (
                    px + 4 * hw < 0 ||
                    px - 4 * hw > Renderer.worldWidth() ||
                    py + 4 * hh < 0 ||
                    py - 4 * hh > Renderer.worldHeight()
                ) {
                    const id = chunk.views.EntityId[i];

                    cmd.remove(id);
                }
            }
        });

        // Mouse.update();
    }
}
