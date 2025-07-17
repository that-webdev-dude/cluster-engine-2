import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Cmath } from "../../../cluster/tools";
import { Component } from "../components";
import { meteorArchetype } from "../entities/meteor";
import { GLOBALS } from "../globals";
import { Store } from "../../../cluster/core/Store";
import { Event } from "../../../cluster/core/Emitter";
import { ScoreEvent } from "../events";

const { worldW, worldH } = GLOBALS;

export class MeteorSystem extends StorageUpdateSystem {
    constructor(store: Store) {
        super(store);
        this.store.on(
            "meteorHit",
            (event: Event) => {
                this.store.dispatch("incrementScores", 1);
                this.store.emit({ type: "scoreEvent" }, false);
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
                    let r = (cmd as any).scene.findEntityId(
                        meteorArchetype,
                        chunkId,
                        i
                    );

                    cmd.remove(r[0]);
                }
            }
        });
    }
}
