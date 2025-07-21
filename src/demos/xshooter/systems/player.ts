import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";
import { bulletArchetype, getBulletComponents } from "../entities/bullet";
import { Store } from "../../../cluster";
import { PlayerHitEvent, GameTitleEvent } from "../events";

const State = {
    shotInterval: 0.5,
};

export class PlayerSystem extends StorageUpdateSystem {
    private counter = State.shotInterval;

    constructor(readonly store: Store) {
        super(store);

        store.on<PlayerHitEvent>("playerHit", (e) => {
            store.dispatch("decrementLives", 1);

            const lives = store.get("lives");
            if (lives <= 0) {
                const gameTitleEvent: GameTitleEvent = {
                    type: "gameTitle",
                };
                store.emit(gameTitleEvent, false);
            }
        });
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith([Component.Player], (chunk) => {
            this.counter -= dt;

            const mx = Mouse.virtualPosition.x;
            const my = Mouse.virtualPosition.y;

            if (this.counter <= 0) {
                const bulletComponents = getBulletComponents(mx, my);

                cmd.create(bulletArchetype, bulletComponents);

                this.counter = State.shotInterval;
            }

            // only one player is expected
            if (chunk.count > 1) {
                console.warn(
                    `[PlayerSystem]: more than one player is not allowed`
                );
            }

            for (let i = 0; i < chunk.count; i++) {
                const px = chunk.views.Position[i * 2];
                const py = chunk.views.Position[i * 2 + 1];

                chunk.views.Angle[i] = Cmath.angle(px, py, mx, my) + Math.PI;
            }
        });
    }
}
