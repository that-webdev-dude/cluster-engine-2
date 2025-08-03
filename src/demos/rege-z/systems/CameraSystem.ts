import { ECSUpdateSystem } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { Cmath } from "../../../cluster";
import { View } from "../../../cluster";
import { Component } from "../components";
import { Store } from "../../../cluster";

export class CameraSystem extends ECSUpdateSystem {
    private shakeTime = 0;
    private shakeElapsed = 0;
    private shakeDuration = 0.5;
    private maxShakeIntensity = 2;
    private shakeSeedX: number = 0;
    private shakeSeedY: number = 0;

    private basePosition: [number, number] = [0, 0];

    private readonly displayW: number;
    private readonly displayH: number;
    private readonly worldW: number;
    private readonly worldH: number;

    constructor(readonly store: Store) {
        super(store);

        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");

        // store.on<PlayerHitEvent>("playerHit", (e) => {
        //     if (this.shakeTime <= 0) {
        //         this.shakeTime = this.shakeDuration;
        //         this.shakeElapsed = 0;
        //         // this.shakeSeedX = Math.random() * 1000;
        //         // this.shakeSeedY = Math.random() * 1000;
        //         this.basePosition[0] = 0;
        //         this.basePosition[1] = 0;
        //     }
        // });
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
                const speed = chunk.views.Speed;
                const tracker = chunk.views.Tracker;

                prev[0] = pos[0];
                prev[1] = pos[1];

                // camera pan
                // const kx = Keyboard.x();
                // const ky = Keyboard.y();
                // this.basePosition[0] -= kx * speed * dt;
                // this.basePosition[1] -= ky * speed * dt;

                this.basePosition[0] = 0;
                this.basePosition[1] = 0;

                if (tracker) {
                    const trackerIdx = tracker[0];
                    if (trackerIdx >= 0) {
                        let trackerX = 0;
                        let trackerY = 0;

                        view.forEachChunkWith(
                            [trackerIdx, Component.Position],
                            (chunk) => {
                                const count = chunk.count;
                                if (count === 0) return;

                                if (chunk.count > 1)
                                    console.warn(
                                        "[CameraSystem]: Multiple trackers found, using first one"
                                    );

                                for (let i = 0; i < 1; i++) {
                                    trackerX = chunk.views.Position[i * 2 + 0];
                                    trackerY = chunk.views.Position[i * 2 + 1];
                                }
                            }
                        );
                        // Clamp the camera position to the world bounds
                        this.basePosition[0] = Cmath.clamp(
                            trackerX - this.displayW / 2,
                            0,
                            this.worldW - this.displayW
                        );
                        this.basePosition[1] = Cmath.clamp(
                            trackerY - this.displayH / 2,
                            0,
                            this.worldH - this.displayH
                        );
                    }
                }

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
