import { Renderer } from "../../../cluster/gl/Renderer";
import { UpdateableSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Vector } from "../../../cluster/tools/Vector";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";
import { createMeteor } from "../entities/meteor";

const worldW = Renderer.worldWidth();
const worldH = Renderer.worldHeight();
const playerX = worldW / 2;
const playerY = worldH / 2;

const State = {
    level: 1,
    spawnInterval: 1,
    entitiesPerSpawn: 1,
};

export class LevelSystem implements UpdateableSystem {
    private counter = State.spawnInterval;
    private playerPosition = new Vector(worldW / 2, worldH / 2);
    private spawnPosition = new Vector();

    private spawnTop(size: number): { x: number; y: number } {
        return {
            x: Cmath.randf(-size, worldW + size),
            y: -size,
        };
    }

    private spawnRight(size: number): { x: number; y: number } {
        return {
            x: worldW + size,
            y: Cmath.randf(-size, worldH + size),
        };
    }

    private spawnBottom(size: number): { x: number; y: number } {
        return {
            x: Cmath.randf(-size, worldW + size),
            y: worldH + size,
        };
    }

    private spawnLeft(size: number): { x: number; y: number } {
        return {
            x: -size,
            y: Cmath.randf(-size, worldH + size),
        };
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        /**
         * we should have a state somewhere including:
         *  spawnInterval
         *  entitiesPerSpawn
         *
         * decrease the interval
         * if interval is 0
         *
         * calculate a random position off screen
         * allocate entitiesPerSpawn meteors
         */

        this.counter -= dt;
        if (this.counter <= 0) {
            let spawnSize = Cmath.rand(4, 12);

            this.spawnPosition.copy(
                Cmath.randOneFrom([
                    this.spawnTop(spawnSize),
                    this.spawnRight(spawnSize),
                    this.spawnBottom(spawnSize),
                    this.spawnLeft(spawnSize),
                ]) as Vector
            );

            let spawnVelocity = Vector.connect(
                this.spawnPosition,
                this.playerPosition
            )
                .normalize()
                .scale(200);

            let spawnColor = [255, 0, 0, 255];

            // cmd.allocate()

            this.counter = State.spawnInterval;
        }
        // view.forEachChunkWith([Component.Player], (chunk) => {
        //     // only one player is expected
        //     if (chunk.count > 1) {
        //         console.warn(
        //             `[LevelSystem]: more than one player is not allowed`
        //         );
        //     }
        //     for (let i = 0; i < chunk.count; i++) {
        //         const px = chunk.views.Position[i * 2];
        //         const py = chunk.views.Position[i * 2 + 1];
        //         const mx = Mouse.virtualPosition.x;
        //         const my = Mouse.virtualPosition.y;
        //         chunk.views.Angle[i] = Cmath.angle(px, py, mx, my) + Math.PI;
        //     }
        // });
        // Mouse.update();
    }
}
