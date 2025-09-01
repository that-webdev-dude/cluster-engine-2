import {
    ECSUpdateSystem,
    CommandBuffer,
    Cmath,
    View,
    Store,
} from "../../../cluster";
import { Component, DESCRIPTORS } from "../components";
import { EntityMeta, Buffer } from "../../../cluster/types";

export class CameraSystem extends ECSUpdateSystem {
    private shakeTime: number = 0;
    private shakeSeedY: number = 0;
    private shakeSeedX: number = 0;
    private shakeElapsed: number = 0;
    private readonly shakeDuration = 0.5;
    private readonly maxShakeIntensity = 2;

    private basePosition: [number, number] = [0, 0];
    private subjectPosition: Buffer | undefined = undefined;
    private readonly worldW: number;
    private readonly worldH: number;

    constructor(
        readonly store: Store,
        readonly subject: EntityMeta | undefined = undefined
    ) {
        super(store);

        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
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
        if (this.subject && !this.subjectPosition) {
            const slice = view.getSlice(this.subject, DESCRIPTORS.Position);
            if (slice !== undefined) {
                this.subjectPosition = slice.arr;
                return;
            }

            this.subjectPosition = new Float32Array(2);
        }

        view.forEachChunkWith(
            [
                Component.Camera,
                Component.PreviousPosition,
                Component.Position,
                Component.Size,
            ],
            (chunk) => {
                const pos = chunk.views.Position;
                const prev = chunk.views.PreviousPosition;
                const size = chunk.views.Size;

                prev[0] = pos[0];
                prev[1] = pos[1];

                // camera pan
                // const kx = Keyboard.x();
                // const ky = Keyboard.y();
                // this.basePosition[0] -= kx * speed * dt;
                // this.basePosition[1] -= ky * speed * dt;

                // Clamp the camera position to the world bounds
                this.basePosition[0] = 0;
                this.basePosition[1] = 0;
                if (this.subjectPosition) {
                    this.basePosition[0] = Cmath.clamp(
                        this.subjectPosition[0] - size[0] / 2,
                        0,
                        this.worldW - size[0]
                    );
                    this.basePosition[1] = Cmath.clamp(
                        this.subjectPosition[1] - size[1] / 2,
                        0,
                        this.worldH - size[1]
                    );
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
