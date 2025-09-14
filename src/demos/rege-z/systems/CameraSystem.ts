import {
    ECSUpdateSystem,
    CommandBuffer,
    Cmath,
    View,
    Store,
} from "../../../cluster";
import {
    EntityMeta,
    Buffer,
    ComponentDescriptor,
} from "../../../cluster/types";
import { Component, DESCRIPTORS } from "../components";

enum CameraIndex {
    VELOCITY_X = 0,
    VELOCITY_Y = 1,
    SPRING_FRQ_X = 2, // THIS GOES IN SETTINGS
    SPRING_FRQ_Y = 3, // THIS GOES IN SETTINGS
    LOOK_AHEAD_X = 4, // THIS GOES IN SETTINGS
    LOOK_AHEAD_Y = 5, // THIS GOES IN SETTINGS
}

export class CameraSystem extends ECSUpdateSystem {
    private subjectPosition: Buffer | undefined = undefined;
    private subjectVelocity: Buffer | undefined = undefined;
    private subjectAirborne: Buffer | undefined = undefined;

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
    private readonly lookAheadDeadBandEnter = 8; // px/s to disable
    private readonly lookAheadDeadBandExit = 10; // px/s to re‑enable
    private lookAheadXActive = false;
    private lookAheadYActive = false;

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

    // TODO: can be renamed to get subject slice
    private getSubjectWSlice(
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
        this.subjectPosition = this.getSubjectWSlice(
            view,
            DESCRIPTORS.Position
        );
        this.subjectVelocity = this.getSubjectWSlice(
            view,
            DESCRIPTORS.Velocity
        );
        // this.subjectAirborne = this.getSubjectWSlice(
        //     view,
        //     DESCRIPTORS.Airborne / Jumping
        // );
    }

    public updateDeadZonePosition(
        pos: Buffer,
        halfW: number,
        halfH: number,
        deadZoneHalfW: number,
        deadZoneHalfH: number
    ) {
        if (!this.subjectPosition) return;

        const [subjectPositionX, subjectPositionY] = this.subjectPosition;
        const deadZoneDesiredX = subjectPositionX - pos[0];
        const deadZoneDesiredY = subjectPositionY - pos[1];
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

        // After computing deadZoneX/Y:
        this.deadZoneX = Cmath.clamp(
            this.deadZoneX,
            halfW,
            this.worldW - halfW
        );
        this.deadZoneY = Cmath.clamp(
            this.deadZoneY,
            halfH,
            this.worldH - halfH
        );
    }

    public update(view: View, cmd: CommandBuffer, dt: number) {
        if (this.subject && (!this.subjectPosition || !this.subjectVelocity))
            return;

        // Precompute reachable camera center bounds
        const halfW = this.displayW * 0.5;
        const halfH = this.displayH * 0.5;
        const worldW = this.worldW;
        const worldH = this.worldH;
        const minX = halfW;
        const maxX = worldW - halfW;
        const minY = halfH;
        const maxY = worldH - halfH;
        // per camera constants
        const deadZoneW = this.displayW * this.deadZoneWPerc;
        const deadZoneH = this.displayH * this.deadZoneHPerc;
        const deadZoneHalfW = deadZoneW * 0.5;
        const deadZoneHalfH = deadZoneH * 0.5;

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
            const vx_s = subjectVelocityX;
            const vy_s = subjectVelocityY;

            if (
                !this.lookAheadXActive &&
                Math.abs(vx_s) > this.lookAheadDeadBandExit
            ) {
                this.lookAheadXActive = true;
            }
            if (
                this.lookAheadXActive &&
                Math.abs(vx_s) < this.lookAheadDeadBandEnter
            ) {
                this.lookAheadXActive = false;
            }
            let rawLookAheadX = this.lookAheadXActive
                ? Cmath.clamp(
                      this.lookAheadGainPerSec * vx_s,
                      -this.lookAheadMaxOffset,
                      this.lookAheadMaxOffset
                  )
                : 0;

            if (
                !this.lookAheadYActive &&
                Math.abs(vy_s) > this.lookAheadDeadBandExit
            ) {
                this.lookAheadYActive = true;
            }
            if (
                this.lookAheadYActive &&
                Math.abs(vy_s) < this.lookAheadDeadBandEnter
            ) {
                this.lookAheadYActive = false;
            }
            let rawLookAheadY = this.lookAheadYActive
                ? Cmath.clamp(
                      this.lookAheadGainPerSec * vy_s,
                      -this.lookAheadMaxOffset,
                      this.lookAheadMaxOffset
                  )
                : 0;

            // lookahead should be disabled if subject is airborne
            const isAirborne = this.subjectAirborne ?? false;
            if (isAirborne) lookAheadY *= 0.0;

            const alpha = 1 - Math.exp(-dt / this.lookAheadTau);
            lookAheadX += alpha * (rawLookAheadX - lookAheadX);
            lookAheadY += alpha * (rawLookAheadY - lookAheadY);

            camera[CameraIndex.LOOK_AHEAD_X] = lookAheadX;
            camera[CameraIndex.LOOK_AHEAD_Y] = lookAheadY;

            // Many platformers disable or reduce look‑ahead in Y while jumping/falling to avoid seasickness. Keep X always on; set lookAheadY = 0 initially
            // Dash: temporarily raise L (e.g., +50%) and/or k for 250–350 ms from dash start so the camera leads more
            // Aiming: if you have an aim vector or mouse, bias look‑ahead toward aim direction, but clamp with the same L

            this.updateDeadZonePosition(
                pos,
                halfW,
                halfH,
                deadZoneHalfW,
                deadZoneHalfH
            );

            // add the look ahead to the dead zone
            this.deadZoneX += lookAheadX;
            this.deadZoneY += lookAheadY;

            // …after updateDeadZonePosition(pos):
            let targetX = this.deadZoneX + lookAheadX;
            let targetY = this.deadZoneY + lookAheadY;
            // Clamp the target to reachable area
            targetX = Cmath.clamp(targetX, minX, maxX);
            targetY = Cmath.clamp(targetY, minY, maxY);

            // Spring acceleration uses the clamped target
            const cameraAccX =
                -2 * springFreqX * cameraVelX -
                springFreqX * springFreqX * (pos[0] - targetX);
            const cameraAccY =
                -2 * springFreqY * cameraVelY -
                springFreqY * springFreqY * (pos[1] - targetY);

            // integrate velocity and position
            cameraVelX += cameraAccX * dt;
            cameraVelY += cameraAccY * dt;
            pos[0] += cameraVelX * dt;
            pos[1] += cameraVelY * dt;

            // Clamp the position and zero velocity if clamped
            const prevX = pos[0];
            const prevY = pos[1];
            pos[0] = Cmath.clamp(pos[0], minX, maxX);
            pos[1] = Cmath.clamp(pos[1], minY, maxY);
            if (pos[0] !== prevX) cameraVelX = 0;
            if (pos[1] !== prevY) cameraVelY = 0;

            // write back updated velocity
            camera[CameraIndex.VELOCITY_X] = cameraVelX;
            camera[CameraIndex.VELOCITY_Y] = cameraVelY;

            // visual debug dead zone
            if (this.dbContext) {
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
