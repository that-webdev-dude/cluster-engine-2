import {
    ECSUpdateSystem,
    CommandBuffer,
    Cmath,
    Store,
    View,
} from "../../../cluster";
import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    VelocityIndex,
    OffsetIndex,
    CameraIndex,
    CameraSettingsIndex,
    CameraFlags,
    SizeIndex,
} from "../components";
import {
    ComponentDescriptor,
    EntityMeta,
    Buffer,
} from "../../../cluster/types";

// original camera system
// export class CameraSystem extends ECSUpdateSystem {
//     private subjectPosition: Buffer | undefined = undefined;
//     private subjectVelocity: Buffer | undefined = undefined;
//     private subjectAirborne: Buffer | undefined = undefined;

//     private readonly worldW: number;
//     private readonly worldH: number;
//     private readonly displayW: number;
//     private readonly displayH: number;

//     // dead zone
//     private deadZoneX: number = 0;
//     private deadZoneY: number = 0;

//     private lookAheadXActive = false;
//     private lookAheadYActive = false;

//     // debug
//     private readonly dbContext: CanvasRenderingContext2D | null;
//     private readonly dbCanvas: HTMLCanvasElement;

//     constructor(
//         readonly store: Store,
//         readonly subject: EntityMeta | undefined = undefined
//     ) {
//         super(store);
//         this.worldW = store.get("worldW");
//         this.worldH = store.get("worldH");
//         this.displayW = store.get("displayW");
//         this.displayH = store.get("displayH");

//         // visual debug canvas
//         const dbCanvas = document.createElement("canvas");
//         dbCanvas.width = this.displayW;
//         dbCanvas.height = this.displayH;
//         dbCanvas.style.zIndex = "9999";
//         dbCanvas.style.border = "4px solid red";
//         dbCanvas.style.pointerEvents = "none";
//         document.querySelector("#app")?.appendChild(dbCanvas);
//         this.dbContext = dbCanvas.getContext("2d");
//         this.dbCanvas = dbCanvas;
//     }

//     private getSubjectWSlice(
//         view: View,
//         desc: ComponentDescriptor
//     ): Buffer | undefined {
//         if (this.subject) {
//             const slice = view.getSlice(this.subject, desc);
//             if (slice !== undefined) {
//                 return slice.arr;
//             }
//         }
//         return undefined;
//     }

//     public prerun(view: View): void {
//         this.subjectPosition = this.getSubjectWSlice(
//             view,
//             DESCRIPTORS.Position
//         );
//         this.subjectVelocity = this.getSubjectWSlice(
//             view,
//             DESCRIPTORS.Velocity
//         );
//         // this.subjectAirborne = this.getSubjectWSlice(
//         //     view,
//         //     DESCRIPTORS.Airborne / Jumping
//         // );
//     }

//     public updateDeadZonePosition(
//         pos: Buffer,
//         halfW: number,
//         halfH: number,
//         deadZoneHalfW: number,
//         deadZoneHalfH: number
//     ) {
//         if (!this.subjectPosition) return;

//         this.deadZoneX = 0;
//         this.deadZoneY = 0;
//         const [subjectPositionX, subjectPositionY] = this.subjectPosition;
//         const deadZoneDesiredX = subjectPositionX - pos[PositionIndex.X];
//         const deadZoneDesiredY = subjectPositionY - pos[PositionIndex.Y];
//         if (
//             Math.abs(deadZoneDesiredX) <= deadZoneHalfW &&
//             Math.abs(deadZoneDesiredY) <= deadZoneHalfH
//         ) {
//             this.deadZoneX = pos[PositionIndex.X];
//             this.deadZoneY = pos[PositionIndex.Y];
//         } else {
//             this.deadZoneX =
//                 subjectPositionX -
//                 Cmath.clamp(deadZoneDesiredX, -deadZoneHalfW, deadZoneHalfW);
//             this.deadZoneY =
//                 subjectPositionY -
//                 Cmath.clamp(deadZoneDesiredY, -deadZoneHalfH, deadZoneHalfH);
//         }

//         // After computing deadZoneX/Y:
//         this.deadZoneX = Cmath.clamp(
//             this.deadZoneX,
//             halfW,
//             this.worldW - halfW
//         );
//         this.deadZoneY = Cmath.clamp(
//             this.deadZoneY,
//             halfH,
//             this.worldH - halfH
//         );
//     }

//     public update(view: View, cmd: CommandBuffer, dt: number) {
//         if (this.subject && (!this.subjectPosition || !this.subjectVelocity))
//             return;

//         // Precompute reachable camera center bounds
//         const halfW = this.displayW * 0.5;
//         const halfH = this.displayH * 0.5;
//         const worldW = this.worldW;
//         const worldH = this.worldH;
//         const minX = halfW;
//         const maxX = worldW - halfW;
//         const minY = halfH;
//         const maxY = worldH - halfH;

//         view.forEachChunkWith(
//             [
//                 Component.Camera,
//                 Component.CameraSettings,
//                 Component.Position,
//                 Component.Velocity,
//             ],
//             (chunk) => {
//                 const camera = chunk.views.Camera;
//                 const settings = chunk.views.CameraSettings;
//                 const pos = chunk.views.Position;
//                 const vel = chunk.views.Velocity;

//                 // Camera state
//                 let springFreqX = camera[CameraIndex.SPRING_FREQ_X];
//                 let springFreqY = camera[CameraIndex.SPRING_FREQ_Y];
//                 let lookAheadX = camera[CameraIndex.LOOK_AHEAD_X];
//                 let lookAheadY = camera[CameraIndex.LOOK_AHEAD_Y];

//                 // Settings
//                 const deadZoneWPerc =
//                     settings[CameraSettingsIndex.DEAD_ZONE_W_PERC];
//                 const deadZoneHPerc =
//                     settings[CameraSettingsIndex.DEAD_ZONE_H_PERC];
//                 const lookAheadGainPerSec =
//                     settings[CameraSettingsIndex.LOOK_AHEAD_GAIN_PER_SEC];
//                 const lookAheadMaxOffset =
//                     settings[CameraSettingsIndex.LOOK_AHEAD_MAX_OFFSET];
//                 const lookAheadTau =
//                     settings[CameraSettingsIndex.LOOK_AHEAD_TAU];
//                 const deadBandEnter =
//                     settings[CameraSettingsIndex.DEAD_BAND_ENTER];
//                 const deadBandExit =
//                     settings[CameraSettingsIndex.DEAD_BAND_EXIT];
//                 const airborneYScale =
//                     settings[CameraSettingsIndex.AIRBORNE_Y_SCALE];
//                 const flags = settings[CameraSettingsIndex.FLAGS] | 0;

//                 // Dead-zone dims (px)
//                 const deadZoneW = this.displayW * deadZoneWPerc;
//                 const deadZoneH = this.displayH * deadZoneHPerc;
//                 const deadZoneHalfW = deadZoneW * 0.5;
//                 const deadZoneHalfH = deadZoneH * 0.5;

//                 // Update dead-zone (projected into reachable space)
//                 this.updateDeadZonePosition(
//                     pos,
//                     halfW,
//                     halfH,
//                     deadZoneHalfW,
//                     deadZoneHalfH
//                 );

//                 // Subject velocity (px/s)
//                 const vx_s = this.subjectVelocity![VelocityIndex.X];
//                 const vy_s = this.subjectVelocity![VelocityIndex.Y];

//                 // Hysteresis
//                 if (!this.lookAheadXActive && Math.abs(vx_s) > deadBandExit)
//                     this.lookAheadXActive = true;
//                 if (this.lookAheadXActive && Math.abs(vx_s) < deadBandEnter)
//                     this.lookAheadXActive = false;

//                 if (!this.lookAheadYActive && Math.abs(vy_s) > deadBandExit)
//                     this.lookAheadYActive = true;
//                 if (this.lookAheadYActive && Math.abs(vy_s) < deadBandEnter)
//                     this.lookAheadYActive = false;

//                 let rawLookAheadX = this.lookAheadXActive
//                     ? Cmath.clamp(
//                           lookAheadGainPerSec * vx_s,
//                           -lookAheadMaxOffset,
//                           lookAheadMaxOffset
//                       )
//                     : 0;

//                 let rawLookAheadY = this.lookAheadYActive
//                     ? Cmath.clamp(
//                           lookAheadGainPerSec * vy_s,
//                           -lookAheadMaxOffset,
//                           lookAheadMaxOffset
//                       )
//                     : 0;

//                 // Flags + airborne handling
//                 const yEnabled = (flags & CameraFlags.EnableYLookAhead) !== 0;
//                 if (!yEnabled) rawLookAheadY = 0;

//                 const airborneBuf = this.subjectAirborne;
//                 const isAirborne = !!(airborneBuf && airborneBuf[0] !== 0);
//                 if (isAirborne) rawLookAheadY *= airborneYScale;

//                 // EMA smoothing using settings’ tau
//                 const alpha = 1 - Math.exp(-dt / lookAheadTau);
//                 lookAheadX += alpha * (rawLookAheadX - lookAheadX);
//                 lookAheadY += alpha * (rawLookAheadY - lookAheadY);

//                 // Persist smoothed state
//                 camera[CameraIndex.LOOK_AHEAD_X] = lookAheadX;
//                 camera[CameraIndex.LOOK_AHEAD_Y] = lookAheadY;

//                 // Compose target and clamp to reachable area
//                 let targetX = this.deadZoneX + lookAheadX;
//                 let targetY = this.deadZoneY + lookAheadY;
//                 targetX = Cmath.clamp(targetX, minX, maxX);
//                 targetY = Cmath.clamp(targetY, minY, maxY);

//                 // Spring acceleration toward clamped target
//                 const accX =
//                     -2 * springFreqX * vel[VelocityIndex.X] -
//                     springFreqX *
//                         springFreqX *
//                         (pos[PositionIndex.X] - targetX);
//                 const accY =
//                     -2 * springFreqY * vel[VelocityIndex.Y] -
//                     springFreqY *
//                         springFreqY *
//                         (pos[PositionIndex.Y] - targetY);

//                 // Integrate camera velocity (MotionSystem will integrate Position)
//                 vel[VelocityIndex.X] += accX * dt;
//                 vel[VelocityIndex.Y] += accY * dt;

//                 // Debug overlay (flag‑controlled)
//                 if (this.dbContext && flags & CameraFlags.DebugOverlay) {
//                     const cw = this.dbCanvas.width,
//                         ch = this.dbCanvas.height;
//                     this.dbContext.clearRect(0, 0, cw, ch);
//                     this.dbContext.strokeStyle = "yellow";
//                     const x = (cw - deadZoneW) * 0.5;
//                     const y = (ch - deadZoneH) * 0.5;
//                     this.dbContext.strokeRect(
//                         Math.round(x),
//                         Math.round(y),
//                         deadZoneW,
//                         deadZoneH
//                     );
//                 }
//             }
//         );
//     }
// }

// here we have the camera settings values for now
const cameraSettings = {
    lookAheadOffsetX: 128,
    lookAheadOffsetY: 64,
};

type ComponentSlice = { arr: Buffer; base: number };

export class CameraSystem extends ECSUpdateSystem {
    private subjectPosition: ComponentSlice | undefined = undefined;
    private subjectVelocity: ComponentSlice | undefined = undefined;

    // Add interpolation properties
    private currentOffsetX: number = 0;
    private currentOffsetY: number = 0;
    private targetOffsetX: number = 0;
    private targetOffsetY: number = 0;
    private readonly interpolationSpeed: number = 2.5; // Adjust this to control smoothness

    private readonly worldW: number;
    private readonly worldH: number;
    private readonly displayW: number;
    private readonly displayH: number;

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

    public prerun(view: View): void {
        this.subjectPosition =
            this.getSubjectWSlice(view, DESCRIPTORS.Position) ?? undefined;
        this.subjectVelocity =
            this.getSubjectWSlice(view, DESCRIPTORS.Velocity) ?? undefined;
    }

    private getSubjectWSlice(
        view: View,
        desc: ComponentDescriptor
    ): ComponentSlice | undefined {
        if (this.subject) {
            const slice = view.getSlice(this.subject, desc);
            if (slice !== undefined) {
                return slice;
            }
        }
        return undefined;
    }

    private getSubjectX(): number {
        return this.subjectPosition!.arr[
            this.subjectPosition!.base + PositionIndex.X
        ];
    }

    private getSubjectY(): number {
        return this.subjectPosition!.arr[
            this.subjectPosition!.base + PositionIndex.Y
        ];
    }

    private getSubjectVelocityX(): number {
        return this.subjectVelocity!.arr[
            this.subjectVelocity!.base + VelocityIndex.X
        ];
    }

    private getSubjectVelocityY(): number {
        return this.subjectVelocity!.arr[
            this.subjectVelocity!.base + VelocityIndex.Y
        ];
    }

    public update(view: View, cmd: CommandBuffer, dt: number) {
        if (this.subject && (!this.subjectPosition || !this.subjectVelocity))
            return;

        view.forEachChunkWith(
            [
                Component.Camera,
                Component.CameraSettings,
                Component.Position,
                Component.Offset,
                Component.Velocity,
            ],
            (chunk) => {
                const size = chunk.views.Size;
                const pos = chunk.views.Position;
                const off = chunk.views.Offset;
                const vel = chunk.views.Velocity;

                vel[VelocityIndex.X] = this.getSubjectVelocityX();
                vel[VelocityIndex.Y] = this.getSubjectVelocityY();

                // Only update target offset when player is moving
                if (Math.abs(vel[VelocityIndex.X]) > 0) {
                    this.targetOffsetX =
                        cameraSettings.lookAheadOffsetX *
                        Math.sign(vel[VelocityIndex.X]);

                    // Smooth interpolation towards target offset only when moving
                    const lerpFactor =
                        1 - Math.exp(-this.interpolationSpeed * dt);
                    this.currentOffsetX +=
                        (this.targetOffsetX - this.currentOffsetX) * lerpFactor;
                }
                if (Math.abs(vel[VelocityIndex.Y]) > 0) {
                    this.targetOffsetY =
                        cameraSettings.lookAheadOffsetY *
                        Math.sign(vel[VelocityIndex.Y]);

                    // Smooth interpolation towards target offset only when moving
                    const lerpFactor =
                        1 - Math.exp(-this.interpolationSpeed * dt);
                    this.currentOffsetY +=
                        (this.targetOffsetY - this.currentOffsetY) * lerpFactor;
                }

                // Apply the current offset (whether interpolated or maintained)
                off[OffsetIndex.X] = this.currentOffsetX;
                off[OffsetIndex.Y] = this.currentOffsetY;

                if (this.dbContext) {
                    this.dbContext.clearRect(
                        0,
                        0,
                        this.displayW,
                        this.displayH
                    );

                    // Draw lookahead offset box in the center of the screen
                    const centerX = this.displayW / 2;
                    const centerY = this.displayH / 2;

                    // Box dimensions based on lookahead offsets
                    const boxWidth = cameraSettings.lookAheadOffsetX * 2;
                    const boxHeight = cameraSettings.lookAheadOffsetY * 2;

                    // Box position (centered)
                    const boxX = centerX - boxWidth / 2;
                    const boxY = centerY - boxHeight / 2;

                    // Outer box dimensions (20% bigger)
                    const outerBoxWidth = boxWidth * 1.4;
                    const outerBoxHeight = boxHeight * 1.4;
                    const outerBoxX = centerX - outerBoxWidth / 2;
                    const outerBoxY = centerY - outerBoxHeight / 2;

                    // Draw the outer box first
                    this.dbContext.strokeStyle = "gray";
                    this.dbContext.lineWidth = 1;
                    this.dbContext.strokeRect(
                        outerBoxX,
                        outerBoxY,
                        outerBoxWidth,
                        outerBoxHeight
                    );

                    // Draw the lookahead box
                    this.dbContext.strokeStyle = "cyan";
                    this.dbContext.lineWidth = 2;
                    this.dbContext.strokeRect(boxX, boxY, boxWidth, boxHeight);

                    // Draw center crosshair
                    this.dbContext.strokeStyle = "red";
                    this.dbContext.lineWidth = 1;
                    this.dbContext.beginPath();
                    this.dbContext.moveTo(centerX - 10, centerY);
                    this.dbContext.lineTo(centerX + 10, centerY);
                    this.dbContext.moveTo(centerX, centerY - 10);
                    this.dbContext.lineTo(centerX, centerY + 10);
                    this.dbContext.stroke();
                }
            }
        );
    }
}
