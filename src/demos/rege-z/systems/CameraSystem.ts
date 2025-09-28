import { ComponentSlice, EntityMeta } from "../../../cluster/types";
import {
    DebugOverlay,
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
    SizeIndex,
} from "../components";

// Smart camera that smoothly follows a player with look-ahead prediction
export class CameraSystem extends ECSUpdateSystem {
    // Player position and movement data
    private subjectPosition: ComponentSlice | undefined = undefined;
    private subjectVelocity: ComponentSlice | undefined = undefined;

    // World and screen dimensions
    private readonly worldW: number;
    private readonly worldH: number;
    private readonly displayW: number;
    private readonly displayH: number;

    private readonly db: DebugOverlay;

    constructor(
        readonly store: Store,
        readonly subjectMeta: EntityMeta | undefined = undefined
    ) {
        super(store);
        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
        this.db = new DebugOverlay(this.displayW, this.displayH, 100, true);
    }

    public prerun(view: View): void {
        if (this.subjectMeta) {
            this.subjectPosition =
                this.getEntitySlice(
                    view,
                    this.subjectMeta,
                    DESCRIPTORS.Position
                ) ?? undefined;
            this.subjectVelocity =
                this.getEntitySlice(
                    view,
                    this.subjectMeta,
                    DESCRIPTORS.Velocity
                ) ?? undefined;
        }
    }

    public update(view: View, cmd: CommandBuffer, dt: number) {
        if (dt <= 0) return;

        if (
            this.subjectMeta &&
            (!this.subjectPosition || !this.subjectVelocity)
        )
            return;

        const camStride = DESCRIPTORS.Camera.count;
        const posStride = DESCRIPTORS.Position.count;
        const velStride = DESCRIPTORS.Velocity.count;
        const offStride = DESCRIPTORS.Offset.count;
        const sizeStride = DESCRIPTORS.Size.count;

        view.forEachChunkWith(
            [
                Component.Camera,
                Component.Position,
                Component.Velocity,
                Component.Offset,
                Component.Size,
            ],
            (chunk) => {
                const camera = chunk.views.Camera;
                const pos = chunk.views.Position;
                const vel = chunk.views.Velocity;
                const off = chunk.views.Offset;
                const size = chunk.views.Size;

                // multi camera support
                for (let i = 0; i < chunk.count; i++) {
                    const camBase = i * camStride;
                    if (camera[camBase + CameraIndex.ENABLED] === 0) continue; // camera is not enabled so do nothing

                    // Get player position and movement
                    const px = this.getSubjectX();
                    const py = this.getSubjectY();
                    const lpx = this.getSubjectPrevX();
                    const lpy = this.getSubjectPrevY();
                    const pvx = this.getSubjectVelocityX();
                    const pvy = this.getSubjectVelocityY();
                    const s = Math.sqrt(pvx * pvx + pvy * pvy); // player speed

                    // Read per-entity camera configuration
                    const leadTime = camera[camBase + CameraIndex.LEAD_TIME];
                    const baseDistance =
                        camera[camBase + CameraIndex.BASE_DISTANCE];
                    const speedCurveK =
                        camera[camBase + CameraIndex.SPEED_CURVE_K];
                    const dirSharpness =
                        camera[camBase + CameraIndex.DIR_SHARPNESS];
                    const enableSpeedEnter =
                        camera[camBase + CameraIndex.ENABLE_SPEED_ENTER];
                    const enableSpeedExit =
                        camera[camBase + CameraIndex.ENABLE_SPEED_EXIT];
                    const maxOffset = camera[camBase + CameraIndex.MAX_OFFSET];
                    const fadeOnHalfLife =
                        camera[camBase + CameraIndex.FADE_ON_HALF_LIFE];
                    const fadeOffHalfLife =
                        camera[camBase + CameraIndex.FADE_OFF_HALF_LIFE];
                    const teleportThreshold =
                        camera[camBase + CameraIndex.TELEPORT_THRESHOLD];
                    const snapMaxSpeed =
                        camera[camBase + CameraIndex.SNAP_MAX_SPEED];

                    // Read runtime state from component
                    let lookDirX = camera[camBase + CameraIndex.LOOK_DIR_X];
                    let lookDirY = camera[camBase + CameraIndex.LOOK_DIR_Y];
                    let lookActive = camera[
                        camBase + CameraIndex.LOOK_ACTIVE
                    ] as 0 | 1;
                    let lookWeight = camera[camBase + CameraIndex.LOOK_WEIGHT];

                    // Smart look-ahead activation - prevents jittery switching
                    // Only look ahead when player is moving fast enough
                    // Gate stays the same…
                    if (!lookActive && s > enableSpeedEnter) lookActive = 1;
                    if (lookActive && s < enableSpeedExit) lookActive = 0;

                    // Smooth magnitude weight (0..1) using half-lives
                    const fadeOn = Math.log(2) / fadeOnHalfLife;
                    const fadeOff = Math.log(2) / fadeOffHalfLife;
                    const wLambda = lookActive ? fadeOn : fadeOff;
                    // Exponential decay toward target (0 or 1)
                    lookWeight +=
                        ((lookActive ? 1 : 0) - lookWeight) *
                        (1 - Math.exp(-wLambda * dt));

                    // Calculate desired look direction based on player movement
                    let desiredDirX = lookDirX;
                    let desiredDirY = lookDirY;
                    if (lookActive && s > 0) {
                        desiredDirX = pvx / s; // normalize velocity to get direction
                        desiredDirY = pvy / s;
                    }
                    // Smoothly blend to new direction - prevents sudden camera snaps
                    const blend = 1 - Math.exp(-dirSharpness * dt);
                    lookDirX += (desiredDirX - lookDirX) * blend;
                    lookDirY += (desiredDirY - lookDirY) * blend;
                    // Keep look direction normalized (unit vector)
                    const l = Math.sqrt(
                        lookDirX * lookDirX + lookDirY * lookDirY
                    );
                    if (l > 0) {
                        lookDirX /= l;
                        lookDirY /= l;
                    }

                    // Calculate how far ahead to look
                    const predictX = pvx * leadTime;
                    const predictY = pvy * leadTime;
                    const mag = (baseDistance + speedCurveK * s) * lookWeight; // <— scaled
                    let offsetX = lookDirX * mag + predictX;
                    let offsetY = lookDirY * mag + predictY;

                    // Clamp offset to maximum distance
                    const offsetLen = Math.sqrt(
                        offsetX * offsetX + offsetY * offsetY
                    );
                    if (offsetLen > maxOffset) {
                        const r = maxOffset / (offsetLen || 1);
                        offsetX *= r;
                        offsetY *= r;
                    }

                    // Where the camera wants to be (player + offset)
                    let desiredX = px + offsetX;
                    let desiredY = py + offsetY;

                    // clamp the desired xy to the world
                    const offBase = i * offStride;
                    const offX = off ? off[offBase + OffsetIndex.X] : 0;
                    const offY = off ? off[offBase + OffsetIndex.Y] : 0;
                    const sizeBase = i * sizeStride;
                    const viewW = size
                        ? size[sizeBase + SizeIndex.WIDTH]
                        : this.displayW;
                    const viewH = size
                        ? size[sizeBase + SizeIndex.HEIGHT]
                        : this.displayH;
                    const halfW = viewW * 0.5;
                    const halfH = viewH * 0.5;

                    const minCx = halfW - offX;
                    const maxCx = this.worldW - halfW - offX;
                    const minCy = halfH - offY;
                    const maxCy = this.worldH - halfH - offY;

                    if (maxCx >= minCx)
                        desiredX = Cmath.clamp(desiredX, minCx, maxCx);
                    if (maxCy >= minCy)
                        desiredY = Cmath.clamp(desiredY, minCy, maxCy);

                    // Get current camera position and velocity
                    const posBase = i * posStride;
                    const cx = pos[posBase + PositionIndex.X];
                    const cy = pos[posBase + PositionIndex.Y];

                    const velBase = i * velStride;
                    const cvx = vel[velBase + VelocityIndex.X];
                    const cvy = vel[velBase + VelocityIndex.Y];

                    // If teleported: set a velocity that lands us exactly on desired this frame.
                    let teleported = false;
                    let pdx = px - lpx;
                    let pdy = py - lpy;
                    if (Math.hypot(pdx, pdy) > teleportThreshold) {
                        teleported = true;
                    }
                    if (teleported) {
                        let snapVx = (desiredX - cx) / dt;
                        let snapVy = (desiredY - cy) / dt;
                        const snapV = Math.hypot(snapVx, snapVy);
                        if (snapV > snapMaxSpeed) {
                            const k = snapMaxSpeed / (snapV || 1);
                            snapVx *= k;
                            snapVy *= k;
                        }
                        vel[velBase + VelocityIndex.X] = snapVx;
                        vel[velBase + VelocityIndex.Y] = snapVy;
                        // persist updated runtime state before returning
                        camera[camBase + CameraIndex.LOOK_DIR_X] = lookDirX;
                        camera[camBase + CameraIndex.LOOK_DIR_Y] = lookDirY;
                        camera[camBase + CameraIndex.LOOK_ACTIVE] = lookActive;
                        camera[camBase + CameraIndex.LOOK_WEIGHT] = lookWeight;
                        return;
                    }

                    // Add a soft dead‑zone around the target (kills micro‑jitter)
                    let ex = cx - desiredX; // how far off we are
                    let ey = cy - desiredY;
                    const elen = Math.hypot(ex, ey);
                    const deadZone = 32.0; // pixels
                    if (elen <= deadZone) {
                        ex = 0;
                        ey = 0;
                    } else {
                        const k = (elen - deadZone) / (elen || 1);
                        ex *= k;
                        ey *= k;
                    }

                    // Physics-based smooth following (half-life = 0.22 seconds)
                    const followHalfLife = 0.22;
                    const lambda = Math.log(2) / followHalfLife;
                    // Calculate smooth acceleration toward desired position
                    const jx = (cvx + lambda * ex) * dt;
                    const jy = (cvy + lambda * ey) * dt;
                    let newVx = cvx - lambda * jx;
                    let newVy = cvy - lambda * jy;

                    // Prevent camera from moving too fast (safety limit)
                    const maxCamSpeed = 1000;
                    const vLen = Math.hypot(newVx, newVy);
                    if (vLen > maxCamSpeed) {
                        const k = maxCamSpeed / (vLen || 1);
                        newVx *= k;
                        newVy *= k;
                    }

                    // Update camera velocity
                    vel[velBase + VelocityIndex.X] = newVx;
                    vel[velBase + VelocityIndex.Y] = newVy;

                    // Persist runtime state back to component
                    camera[camBase + CameraIndex.LOOK_DIR_X] = lookDirX;
                    camera[camBase + CameraIndex.LOOK_DIR_Y] = lookDirY;
                    camera[camBase + CameraIndex.LOOK_ACTIVE] = lookActive;
                    camera[camBase + CameraIndex.LOOK_WEIGHT] = lookWeight;

                    // Calculate camera viewport in world space
                    const tlx = cx - viewW * 0.5 + offX;
                    const tly = cy - viewH * 0.5 + offY;
                    // Scale factor (1 = 1:1 pixel mapping)
                    const scale = 1;
                    // Convert world coordinates to screen coordinates
                    const w2sX = (wx: number) => (wx - tlx) * scale;
                    const w2sY = (wy: number) => (wy - tly) * scale;
                    // Debug visualization - show camera behavior
                    if (this.db?.enabled) {
                        this.db.clear();
                        this.db.dot(w2sX(cx), w2sY(cy), 3, "#d50000");
                        this.db.dot(w2sX(px), w2sY(py), 3, "#00c853");
                        this.db.dot(
                            w2sX(desiredX),
                            w2sY(desiredY),
                            3,
                            "#2962ff"
                        );
                        this.db.line(
                            w2sX(cx),
                            w2sY(cy),
                            w2sX(desiredX),
                            w2sY(desiredY),
                            1.5,
                            "#2962ff"
                        );
                        this.db.line(
                            w2sX(px),
                            w2sY(py),
                            w2sX(px + pvx * 0.5),
                            w2sY(py + pvy * 0.5),
                            1,
                            "#9e9e9e",
                            4
                        );
                    }
                }
            }
        );
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

    private getSubjectPrevX(): number {
        return this.subjectPosition!.arr[
            this.subjectPosition!.base + PositionIndex.PREV_X
        ];
    }

    private getSubjectPrevY(): number {
        return this.subjectPosition!.arr[
            this.subjectPosition!.base + PositionIndex.PREV_Y
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
}
