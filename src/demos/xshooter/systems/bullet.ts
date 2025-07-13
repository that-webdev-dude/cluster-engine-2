import { UpdateableSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Cmath } from "../../../cluster/tools";
import { Component } from "../components";
import { bulletArchetype } from "../entities/bullet";
import { GLOBALS } from "../globals";

const { worldW, worldH } = GLOBALS;

export class BulletSystem extends UpdateableSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith([Component.Bullet], (chunk, chunkId) => {
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
                    px - 8 * hw > worldW ||
                    py + 8 * hh < 0 ||
                    py - 8 * hh > worldH
                ) {
                    let r = (cmd as any).scene.findEntityId(
                        bulletArchetype,
                        chunkId,
                        i
                    );
                    cmd.remove(r[0]);
                }
            }
        });
    }
}
