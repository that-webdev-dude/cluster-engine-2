import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Cmath } from "../../../cluster/tools";
import { Component } from "../components";
import { GLOBALS } from "../globals";
import { Store } from "../../../cluster/core/Store";
import { MeteorHitEvent, MeteorDiedEvent } from "../events";
import { meteorArchetype } from "../entities/meteor";

const { worldW, worldH } = GLOBALS;

export class MeteorSystem extends StorageUpdateSystem {
    constructor(readonly store: Store) {
        super(store);

        store.on<MeteorHitEvent>(
            "meteorHit",
            (e) => {
                const { cmd, meteorMeta } = e.data;
                cmd.remove(meteorMeta);

                const meteorDiedEvent: MeteorDiedEvent = {
                    type: "meteorDied",
                    data: {
                        cmd,
                        meteorMeta,
                    },
                };
                store.emit(meteorDiedEvent, false); // emit the meteor died event
            },
            false
        );
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
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
                    px - 8 * hw > worldW ||
                    py + 8 * hh < 0 ||
                    py - 8 * hh > worldH
                ) {
                    const generation = chunk.getGeneration(i);

                    cmd.remove({
                        archetype: meteorArchetype,
                        chunkId,
                        row: i,
                        generation,
                    });
                }
            }
        });
    }
}
