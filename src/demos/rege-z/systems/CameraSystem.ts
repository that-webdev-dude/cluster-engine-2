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
    private basePosition: [number, number] = [0, 0];
    private subjectPosition: Buffer | undefined = undefined;
    private readonly worldW: number;
    private readonly worldH: number;
    private readonly displayW: number;
    private readonly displayH: number;

    constructor(
        readonly store: Store,
        readonly subject: EntityMeta | undefined = undefined
    ) {
        super(store);

        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
    }

    prerun(view: View): void {
        if (this.subject && !this.subjectPosition) {
            const slice = view.getSlice(this.subject, DESCRIPTORS.Position);
            if (slice !== undefined) {
                this.subjectPosition = slice.arr;
                return;
            }
        }
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (this.subject && !this.subjectPosition) return; // skip the update if there's no subject

        view.forEachChunkWith([Component.Camera], (chunk) => {
            const camera = chunk.views.Camera;
            const prev = chunk.views.PreviousPosition;
            const pos = chunk.views.Position;

            // prettier-ignore
            const [
                vx, vy,
                tw, ty, 
                ox, oy,
                offset
            ] = camera;

            // compute acceleration
            const ax =
                -2 * ox * vx - ox * ox * (pos[0] - this.subjectPosition![0]);
            const ay =
                -2 * oy * vy - oy * oy * (pos[1] - this.subjectPosition![1]);

            // backup previous position
            prev[0] = pos[0];
            prev[1] = pos[1];

            // integrate velocity back into the component
            camera[0] = vx + ax * dt;
            camera[1] = vy + ay * dt;

            // now advance position using the UPDATED velocities
            pos[0] += camera[0] * dt;
            pos[1] += camera[1] * dt;

            const halfW = this.displayW * 0.5;
            const halfH = this.displayH * 0.5;

            // Handle worlds smaller than the viewport (avoid inverted bounds).
            if (this.worldW <= this.displayW) {
                pos[0] = this.worldW * 0.5; // lock center
                camera[0] = 0; // zero x-velocity so it doesn't fight the clamp
            } else {
                pos[0] = Cmath.clamp(pos[0], halfW, this.worldW - halfW);
            }

            if (this.worldH <= this.displayH) {
                pos[1] = this.worldH * 0.5;
                camera[1] = 0;
            } else {
                pos[1] = Cmath.clamp(pos[1], halfH, this.worldH - halfH);
            }
        });
    }
}
