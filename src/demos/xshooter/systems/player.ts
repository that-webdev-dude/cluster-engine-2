import { UpdateableSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";
import { bulletArchetype, getBulletComponents } from "../entities/bullet";

const State = {
    level: 1,
    shotInterval: 0.5,
    bulletsPerShot: 1,
};

export class PlayerSystem extends UpdateableSystem {
    private counter = State.shotInterval;

    update(view: View, cmd: CommandBuffer, dt: number) {
        this.counter -= dt;

        const mx = Mouse.virtualPosition.x;
        const my = Mouse.virtualPosition.y;

        if (this.counter <= 0) {
            const bulletComponents = getBulletComponents(mx, my);

            cmd.create(bulletArchetype, bulletComponents);

            this.counter = State.shotInterval;
        }

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

                chunk.views.Angle[i] = Cmath.angle(px, py, mx, my) + Math.PI;
            }
        });

        Mouse.update();
    }
}
