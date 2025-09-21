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

// Camera behavior settings - how smart the camera follows the player
const cameraSettings = {
    leadTime: 0.25, // How far ahead to look (in seconds)
    baseDistance: 64, // Base offset distance from player (3 tiles)
    // speedCurveK: 0.6, // Extra offset based on player speed
    speedCurveK: 5, // Extra offset based on player speed
    // dirSharpness: 10.0, // How quickly camera adjusts direction
    dirSharpness: 400, // How quickly camera adjusts direction
    enableSpeedEnter: 0.6, // Speed threshold to start looking ahead
    enableSpeedExit: 0.4, // Speed threshold to stop looking ahead
    // maxOffset: 128, // Maximum distance camera can be from player (~5 tiles)
    maxOffset: 180, // Maximum distance camera can be from player (~5 tiles)
};

type ComponentSlice = { arr: Buffer; base: number };

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

    // Camera state - tracks where it's looking and if look-ahead is active
    private lookDirX: number = 1; // current look direction (normalized)
    private lookDirY: number = 0;
    private lookActive = 0 as 0 | 1; // hysteresis flag - prevents jittery switching

    // Debug visualization - shows camera behavior with colored dots and lines
    private readonly dbContext: CanvasRenderingContext2D | null;

    constructor(
        readonly store: Store,
        readonly subject: EntityMeta | undefined = undefined
    ) {
        super(store);
        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");

        // Create debug canvas overlay to visualize camera behavior
        const dbCanvas = document.createElement("canvas");
        dbCanvas.width = this.displayW;
        dbCanvas.height = this.displayH;
        dbCanvas.style.zIndex = "9999";
        dbCanvas.style.border = "2px solid red";
        dbCanvas.style.pointerEvents = "none";
        document.querySelector("#app")?.appendChild(dbCanvas);
        this.dbContext = dbCanvas.getContext("2d");
    }

    public prerun(view: View): void {
        this.subjectPosition =
            this.getSubjectSlice(view, DESCRIPTORS.Position) ?? undefined;
        this.subjectVelocity =
            this.getSubjectSlice(view, DESCRIPTORS.Velocity) ?? undefined;
    }

    public update(view: View, cmd: CommandBuffer, dt: number) {
        if (this.subject && (!this.subjectPosition || !this.subjectVelocity))
            return;

        view.forEachChunkWith(
            [Component.Camera, Component.Position, Component.Velocity],
            (chunk) => {
                const pos = chunk.views.Position;
                const vel = chunk.views.Velocity;

                // Get player position and movement
                const px = this.getSubjectX();
                const py = this.getSubjectY();
                const pvx = this.getSubjectVelocityX();
                const pvy = this.getSubjectVelocityY();
                const s = Math.sqrt(pvx * pvx + pvy * pvy); // player speed

                const {
                    leadTime,
                    baseDistance,
                    speedCurveK,
                    dirSharpness,
                    enableSpeedEnter,
                    enableSpeedExit,
                    maxOffset,
                } = cameraSettings;

                // Smart look-ahead activation - prevents jittery switching
                // Only look ahead when player is moving fast enough
                if (!this.lookActive && s > enableSpeedEnter) {
                    this.lookActive = 1;
                }
                if (this.lookActive && s < enableSpeedExit) {
                    this.lookActive = 0;
                }

                // Calculate desired look direction based on player movement
                let desiredDirX = this.lookDirX;
                let desiredDirY = this.lookDirY;
                if (this.lookActive && s > 0) {
                    desiredDirX = pvx / s; // normalize velocity to get direction
                    desiredDirY = pvy / s;
                }
                // Smoothly blend to new direction - prevents sudden camera snaps
                const blend = 1 - Math.exp(-dirSharpness * dt);
                this.lookDirX += (desiredDirX - this.lookDirX) * blend;
                this.lookDirY += (desiredDirY - this.lookDirY) * blend;
                // Keep look direction normalized (unit vector)
                const l = Math.sqrt(
                    this.lookDirX * this.lookDirX +
                        this.lookDirY * this.lookDirY
                );
                if (l > 0) {
                    this.lookDirX /= l;
                    this.lookDirY /= l;
                }

                // Calculate how far ahead to look
                const predictX = pvx * leadTime; // predict where player will be
                const predictY = pvy * leadTime;
                const mag = baseDistance + speedCurveK * s; // offset grows with speed
                let offsetX = this.lookDirX * mag + predictX;
                let offsetY = this.lookDirY * mag + predictY;

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
                const off = chunk.views.Offset;
                const size = chunk.views.Size;
                const offX = off ? off[OffsetIndex.X] : 0;
                const offY = off ? off[OffsetIndex.Y] : 0;
                const viewW = size ? size[SizeIndex.WIDTH] : this.displayW;
                const viewH = size ? size[SizeIndex.HEIGHT] : this.displayH;
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
                const cx = pos[PositionIndex.X];
                const cy = pos[PositionIndex.Y];
                const cvx = vel[VelocityIndex.X];
                const cvy = vel[VelocityIndex.Y];

                // Add a soft dead‑zone around the target (kills micro‑jitter)
                const deadZone = 32.0; // pixels
                let ex = cx - desiredX; // how far off we are
                let ey = cy - desiredY;
                const elen = Math.hypot(ex, ey);
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
                vel[0] = newVx;
                vel[1] = newVy;

                // Calculate camera viewport in world space
                const tlx = cx - viewW * 0.5 + offX;
                const tly = cy - viewH * 0.5 + offY;

                // Scale factor (1 = 1:1 pixel mapping)
                const scale = 1;

                // Convert world coordinates to screen coordinates
                const w2sX = (wx: number) => (wx - tlx) * scale;
                const w2sY = (wy: number) => (wy - tly) * scale;

                // Debug visualization - show camera behavior
                if (this.dbContext) {
                    const g = this.dbContext;
                    g.clearRect(0, 0, this.displayW, this.displayH);

                    // Helper to draw colored dots
                    const dot = (
                        x: number,
                        y: number,
                        r: number,
                        color: string
                    ) => {
                        g.beginPath();
                        g.arc(x, y, r, 0, Math.PI * 2);
                        g.fillStyle = color;
                        g.fill();
                    };
                    // Draw key points: player (green), desired position (blue), camera (red)
                    dot(w2sX(px), w2sY(py), 3, "#00c853");
                    dot(w2sX(desiredX), w2sY(desiredY), 3, "#2962ff");
                    dot(w2sX(cx), w2sY(cy), 3, "#d50000");

                    // Draw line from camera to desired position
                    g.beginPath();
                    g.moveTo(w2sX(cx), w2sY(cy));
                    g.lineTo(w2sX(desiredX), w2sY(desiredY));
                    g.lineWidth = 1.5;
                    g.strokeStyle = "#2962ff";
                    g.stroke();

                    // Draw player velocity vector (dashed line)
                    g.beginPath();
                    g.moveTo(w2sX(px), w2sY(py));
                    g.lineTo(w2sX(px + pvx * 0.5), w2sY(py + pvy * 0.5));
                    g.setLineDash([4, 4]);
                    g.strokeStyle = "#9e9e9e";
                    g.stroke();
                    g.setLineDash([]);
                }
            }
        );
    }

    private getSubjectSlice(
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
}
