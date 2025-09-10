import {
    ECSUpdateSystem,
    CommandBuffer,
    Cmath,
    View,
    Store,
} from "../../../cluster";
import { Component, DESCRIPTORS } from "../components";
import {
    EntityMeta,
    Buffer,
    ComponentDescriptor,
} from "../../../cluster/types";

export class CameraSystem extends ECSUpdateSystem {
    private subjectPosition: Buffer | undefined = undefined;
    private subjectVelocity: Buffer | undefined = undefined;
    private readonly worldW: number;
    private readonly worldH: number;
    private readonly displayW: number;
    private readonly displayH: number;

    // dead zone
    private readonly deadZoneWPerc: number = 28 / 100; // 28%
    private readonly deadZoneHPerc: number = 20 / 100; // 20%
    private deadZoneX: number = 0;
    private deadZoneY: number = 0;

    // look ahead
    private readonly lookAheadVelocityDeadBand: number = 8; // Threshold below which velocity is treated as zero (no look-ahead). Typical values: 4–8 px/s
    private readonly lookAheadGainPerSec: number = 0.2; // Controls how far ahead the camera looks based on player velocity. Typical values: 0.2–0.35 (seconds)
    private readonly lookAheadMaxOffset: number = 96; // Hard limit for how far the camera can look ahead (per axis or shared). Typical values: 64–128 px (2–4 tiles)
    private readonly lookAheadTau: number = 0.08; // Smoothing factor using EMA (exponential moving average). Typical values: 0.08–0.15 seconds

    // debug
    private readonly dbContext: CanvasRenderingContext2D | null;
    private readonly dbCanvas: HTMLCanvasElement;

    constructor(
        readonly store: Store,
        readonly subject: EntityMeta | undefined = undefined
    ) {
        super(store);
        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");

        // visual debug canvas
        const dbCanvas = document.createElement("canvas");
        dbCanvas.width = this.displayW;
        dbCanvas.height = this.displayH;
        dbCanvas.style.zIndex = "9999";
        dbCanvas.style.border = "4px solid red";
        dbCanvas.style.pointerEvents = "none";
        document.querySelector("#app")?.appendChild(dbCanvas);
        this.dbContext = dbCanvas.getContext("2d");
        this.dbCanvas = dbCanvas;
    }

    private getSubjectProperty(
        view: View,
        desc: ComponentDescriptor
    ): Buffer | undefined {
        if (this.subject) {
            const slice = view.getSlice(this.subject, desc);
            if (slice !== undefined) {
                return slice.arr;
            }
        }
        return undefined;
    }

    public prerun(view: View): void {
        this.subjectPosition = this.getSubjectProperty(
            view,
            DESCRIPTORS.Position
        );
        this.subjectVelocity = this.getSubjectProperty(
            view,
            DESCRIPTORS.Velocity
        );
    }

    public updateDeadZonePosition(pos: Buffer) {
        if (!this.subjectPosition) return;

        const [subjectPositionX, subjectPositionY] = this.subjectPosition;
        const deadZoneDesiredX = subjectPositionX - pos[0];
        const deadZoneDesiredY = subjectPositionY - pos[1];
        const deadZoneW = this.displayW * this.deadZoneWPerc;
        const deadZoneH = this.displayH * this.deadZoneHPerc;
        const deadZoneHalfW = deadZoneW * 0.5;
        const deadZoneHalfH = deadZoneH * 0.5;
        this.deadZoneX = 0;
        this.deadZoneY = 0;
        if (
            Math.abs(deadZoneDesiredX) <= deadZoneHalfW &&
            Math.abs(deadZoneDesiredY) <= deadZoneHalfH
        ) {
            this.deadZoneX = pos[0];
            this.deadZoneY = pos[1];
        } else {
            this.deadZoneX =
                subjectPositionX -
                Cmath.clamp(deadZoneDesiredX, -deadZoneHalfW, deadZoneHalfW);
            this.deadZoneY =
                subjectPositionY -
                Cmath.clamp(deadZoneDesiredY, -deadZoneHalfH, deadZoneHalfH);
        }
    }

    public update(view: View, cmd: CommandBuffer, dt: number) {
        if (this.subject && (!this.subjectPosition || !this.subjectVelocity))
            return;

        view.forEachChunkWith([Component.Camera], (chunk) => {
            const camera = chunk.views.Camera;
            const prev = chunk.views.PreviousPosition;
            const pos = chunk.views.Position;

            // backup previous position
            prev[0] = pos[0];
            prev[1] = pos[1];

            // prettier-ignore
            let [
                cameraVelX, cameraVelY,
                springFreqX, springFreqY,
                lookAheadX, lookAheadY,
            ] = camera;

            const [subjectVelocityX, subjectVelocityY] = this.subjectVelocity!;

            // look ahead offsets
            const vx_s =
                Math.abs(subjectVelocityX) > 0 && dt > 0
                    ? subjectVelocityX / dt // if vel is px/frame
                    : subjectVelocityX;
            const vy_s =
                Math.abs(subjectVelocityY) > 0 && dt > 0
                    ? subjectVelocityY / dt // if vel is px/frame
                    : subjectVelocityY;
            let rawLookAheadX = Cmath.clamp(
                this.lookAheadGainPerSec * vx_s,
                -this.lookAheadMaxOffset,
                this.lookAheadMaxOffset
            );
            let rawLookAheadY = Cmath.clamp(
                this.lookAheadGainPerSec * vy_s,
                -this.lookAheadMaxOffset,
                this.lookAheadMaxOffset
            );

            if (Math.abs(vx_s) <= this.lookAheadVelocityDeadBand)
                rawLookAheadX = 0;
            if (Math.abs(vy_s) <= this.lookAheadVelocityDeadBand)
                rawLookAheadY = 0;

            const deltaTime = Math.min(dt, 1 / 30);
            const alpha = 1 - Math.exp(-deltaTime / this.lookAheadTau);
            lookAheadX += alpha * (rawLookAheadX - lookAheadX);
            lookAheadY += alpha * (rawLookAheadY - lookAheadY);

            camera[4] = lookAheadX;
            camera[5] = lookAheadY;

            // Many platformers disable or reduce look‑ahead in Y while jumping/falling to avoid seasickness. Keep X always on; set lookAheadY = 0 initially
            // Dash: temporarily raise L (e.g., +50%) and/or k for 250–350 ms from dash start so the camera leads more
            // Aiming: if you have an aim vector or mouse, bias look‑ahead toward aim direction, but clamp with the same L

            this.updateDeadZonePosition(pos);

            // add the look ahead to the dead zone
            this.deadZoneX += lookAheadX;
            this.deadZoneY += lookAheadY;

            // spring: compute acceleration (accounts for a soft dead zone)
            const cameraAccX =
                -2 * springFreqX * cameraVelX -
                springFreqX * springFreqX * (pos[0] - this.deadZoneX);
            const cameraAccY =
                -2 * springFreqY * cameraVelY -
                springFreqY * springFreqY * (pos[1] - this.deadZoneY);

            // integrate velocity back into the component
            camera[0] = cameraVelX + cameraAccX * dt;
            camera[1] = cameraVelY + cameraAccY * dt;

            // now advance position using the UPDATED velocities
            pos[0] += camera[0] * dt;
            pos[1] += camera[1] * dt;

            const displayHalfW = this.displayW * 0.5;
            const displayHalfH = this.displayH * 0.5;

            // Handle worlds smaller than the viewport (avoid inverted bounds).
            if (this.worldW <= this.displayW) {
                pos[0] = this.worldW * 0.5; // lock center
                camera[0] = 0; // zero x-velocity so it doesn't fight the clamp
            } else {
                pos[0] = Cmath.clamp(
                    pos[0],
                    displayHalfW,
                    this.worldW - displayHalfW
                );
            }

            if (this.worldH <= this.displayH) {
                pos[1] = this.worldH * 0.5;
                camera[1] = 0;
            } else {
                pos[1] = Cmath.clamp(
                    pos[1],
                    displayHalfH,
                    this.worldH - displayHalfH
                );
            }

            // visual debug dead zone
            if (this.dbContext) {
                const deadZoneW = this.displayW * this.deadZoneWPerc;
                const deadZoneH = this.displayH * this.deadZoneHPerc;
                const cw = this.dbCanvas.width; // use the canvas' actual size
                const ch = this.dbCanvas.height;

                this.dbContext.clearRect(0, 0, cw, ch);
                this.dbContext.strokeStyle = "yellow";

                const x = (cw - deadZoneW) * 0.5;
                const y = (ch - deadZoneH) * 0.5;

                this.dbContext.strokeRect(
                    Math.round(x),
                    Math.round(y),
                    deadZoneW,
                    deadZoneH
                );
            }
        });
    }
}
