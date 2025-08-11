import { ECSUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster";
import { Cmath } from "../../../cluster/tools";
import { Component } from "../components";
import { bulletArchetype } from "../entities/bullet";
import { GLOBALS } from "../globals";
import { Store } from "../../../cluster";
import { BulletHitEvent } from "../events";

const { worldW, worldH } = GLOBALS;

export class BulletSystem extends ECSUpdateSystem {
    constructor(readonly store: Store) {
        super(store);

        // subscribe to bulletHitEvent
        store.on<BulletHitEvent>(
            "bulletHit",
            (e) => {
                const { cmd, bulletMeta } = e.data;
                cmd.remove(bulletMeta);
            },
            false
        );
    }

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
                    const generation = chunk.getGeneration(i);

                    cmd.remove({
                        archetype: bulletArchetype,
                        chunkId,
                        row: i,
                        generation,
                    });
                }
            }
        });
    }
}
