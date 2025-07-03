import { Renderer } from "../../../cluster/gl/Renderer";
import { UpdateableSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Vector } from "../../../cluster/tools/Vector";
import { Cmath } from "../../../cluster/tools";
import { Mouse } from "../input";
import { Component } from "../components";
import { archetype, createMeteor } from "../entities/meteor";

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
    private pPos = new Vector(worldW / 2, worldH / 2);
    private sPos = new Vector();
    private sVel = new Vector();

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
        this.counter -= dt;

        if (this.counter <= 0) {
            let sz = Cmath.rand(16, 32);

            this.sPos.copy(
                Cmath.randOneFrom([
                    this.spawnTop(sz),
                    this.spawnRight(sz),
                    this.spawnBottom(sz),
                    this.spawnLeft(sz),
                ]) as Vector
            );

            this.sVel.copy(this.sPos).connect(this.pPos).normalize().scale(100);

            const comps = {
                [Component.Meteor]: [1],
                [Component.PreviousPosition]: [this.sPos.x, this.sPos.y],
                [Component.Position]: [this.sPos.x, this.sPos.y],
                [Component.Velocity]: [this.sVel.x, this.sVel.y],
                [Component.Offset]: [0, 0],
                [Component.Angle]: [0],
                [Component.Pivot]: [0, 0],
                [Component.Size]: [sz, sz],
                [Component.Color]: [255, 0, 0, 255],
            };

            cmd.create(archetype, comps);

            this.counter = State.spawnInterval;
        }
    }
}
