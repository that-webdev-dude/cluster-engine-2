import { ECSUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { Cmath } from "../../../cluster/tools";
import { View, Store } from "../../../cluster";
import { Component } from "../components";
import { Keyboard } from "../input";
import { PlayerHitEvent } from "../events";

export class CameraSystem extends ECSUpdateSystem {
    private shakeTime = 0;
    private shakeElapsed = 0;
    private readonly shakeDuration = 0.5;
    private readonly maxShakeIntensity = 2;
    private shakeSeedX: number = 0;
    private shakeSeedY: number = 0;
    private basePosition: [number, number] = [0, 0];

    constructor(readonly store: Store) {
        super(store);

        store.on<PlayerHitEvent>("playerHit", (e) => {
            if (this.shakeTime <= 0) {
                this.shakeTime = this.shakeDuration;
                this.shakeElapsed = 0;
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
        return Cmath.randf(-this.maxShakeIntensity, this.maxShakeIntensity);
    }

    private smoothNoiseY(t: number): number {
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
                const speed = chunk.views.Speed;

                prev[0] = pos[0];

                prev[1] = pos[1];

                // camera pan
                const kx = Keyboard.x();
                const ky = Keyboard.y();
                this.basePosition[0] -= kx * speed * dt;
                this.basePosition[1] -= ky * speed * dt;

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

    public dispose(): void {
        this.shakeTime = 0;
        this.shakeElapsed = 0;
        this.shakeSeedX = 0;
        this.shakeSeedY = 0;
        this.basePosition[0] = 0;
        this.basePosition[1] = 0;
    }
}
