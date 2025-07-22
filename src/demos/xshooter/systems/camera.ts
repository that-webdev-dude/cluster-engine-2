import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { Cmath } from "../../../cluster/tools";
import { View } from "../../../cluster/ecs/scene";
import { Component } from "../components";
import { Store } from "../../../cluster";
import { Keyboard } from "../input";
import { PlayerHitEvent } from "../events";

export class CameraSystem extends StorageUpdateSystem {
    private shakeTime = 0;
    private shakeElapsed = 0;
    private shakeDuration = 0.5;
    private maxShakeIntensity = 2;
    private shakeSeedX: number = 0;
    private shakeSeedY: number = 0;
    private basePosition: [number, number] = [0, 0];

    constructor(readonly store: Store) {
        super(store);

        store.on<PlayerHitEvent>("playerHit", (e) => {
            if (this.shakeTime <= 0) {
                this.shakeTime = this.shakeDuration;
                this.shakeElapsed = 0;
                this.shakeSeedX = Math.random() * 1000;
                this.shakeSeedY = Math.random() * 1000;
                this.basePosition[0] = 0;
                this.basePosition[1] = 0;
            }
        });
    }

    private startShake(pos: Float32Array) {
        this.shakeTime = this.shakeDuration;
        this.shakeElapsed = 0;
        this.shakeSeedX = Math.random() * 1000;
        this.shakeSeedY = Math.random() * 1000;
        this.basePosition[0] = pos[0];
        this.basePosition[1] = pos[1];
    }

    private smoothNoiseX(t: number): number {
        // return Math.sin(t * 30 + this.shakeSeedX);
        return Cmath.randf(-this.maxShakeIntensity, this.maxShakeIntensity);
    }

    private smoothNoiseY(t: number): number {
        // return Math.sin(t * 30 + this.shakeSeedY);
        return Cmath.randf(-this.maxShakeIntensity, this.maxShakeIntensity);
    }

    private easeOutExpo(t: number): number {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [
                Component.Camera,
                Component.PreviousPosition,
                Component.Position,
                Component.Speed,
            ],
            (chunk) => {
                const pos = chunk.views.Position;
                const prev = chunk.views.PreviousPosition;

                prev[0] = pos[0];
                prev[1] = pos[1];

                // camera pan
                const kx = Keyboard.x();
                const ky = Keyboard.y();
                this.basePosition[0] -= kx * 200 * dt;
                this.basePosition[1] -= ky * 200 * dt;

                pos[0] = this.basePosition[0];
                pos[1] = this.basePosition[1];

                if (this.shakeTime > 0) {
                    this.shakeTime -= dt;
                    this.shakeElapsed += dt;

                    const progress = this.shakeElapsed / this.shakeDuration;
                    const decay = this.easeOutExpo(1 - progress); // smoother falloff

                    const t = this.shakeElapsed;
                    const dx =
                        this.smoothNoiseX(t) * this.maxShakeIntensity * decay;
                    const dy =
                        this.smoothNoiseY(t) * this.maxShakeIntensity * decay;

                    pos[0] = this.basePosition[0] - dx;
                    pos[1] = this.basePosition[1] - dy;
                }
            }
        );
    }
}
