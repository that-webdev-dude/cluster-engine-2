import { EntityMeta, ComponentSlice } from "../../../cluster/types";
import {
    DebugOverlay,
    ECSUpdateSystem,
    CommandBuffer,
    Store,
    Cmath,
    Input,
    View,
    Vector,
} from "../../../cluster";
import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    AngleIndex,
    WeaponIndex,
    VelocityIndex,
    OffsetIndex,
    SizeIndex,
    CameraIndex,
} from "../components";
import { FireWeaponEvent } from "../events";

const Mouse = Input.Mouse;

const DEBUG_OVERLAY = false;

export class WeaponSystem extends ECSUpdateSystem {
    private readonly weaponRotationOffset = Math.PI / 2; // 90 degrees
    private ownerPosition: ComponentSlice | undefined = undefined;
    private ownerVelocity: ComponentSlice | undefined = undefined;

    private db: DebugOverlay | undefined = undefined;

    private readonly cachedPosVec = new Vector();
    private readonly cachedDirVec = new Vector();
    private readonly cachedTargetVec = new Vector();

    constructor(
        readonly store: Store,
        readonly ownerMeta?: EntityMeta,
        readonly cameraMeta?: EntityMeta
    ) {
        super(store);

        if (DEBUG_OVERLAY) {
            this.db = new DebugOverlay(
                store.get("displayW"),
                store.get("displayH"),
                200,
                DEBUG_OVERLAY
            );
        }
    }

    prerun(view: View): void {
        if (this.ownerMeta && !this.ownerPosition) {
            this.ownerPosition = this.getEntitySlice(
                view,
                this.ownerMeta,
                DESCRIPTORS.Position
            );
        }
        if (this.ownerMeta && !this.ownerVelocity) {
            this.ownerVelocity = this.getEntitySlice(
                view,
                this.ownerMeta,
                DESCRIPTORS.Velocity
            );
        }
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (dt <= 0) return;

        if (this.ownerMeta && !this.ownerPosition) {
            console.warn("[WeaponSystem]: this weapon has no ownerMeta");
            return;
        }

        // Get camera position for the specific camera this weapon is associated with
        let cameraX = 0;
        let cameraY = 0;
        let displayW = 0;
        let displayH = 0;

        if (this.cameraMeta) {
            // Get specific camera by entity meta
            const cameraSlice = this.getEntitySlice(
                view,
                this.cameraMeta,
                DESCRIPTORS.Camera
            );
            const posSlice = this.getEntitySlice(
                view,
                this.cameraMeta,
                DESCRIPTORS.Position
            );
            const sizeSlice = this.getEntitySlice(
                view,
                this.cameraMeta,
                DESCRIPTORS.Size
            );
            const offSlice = this.getEntitySlice(
                view,
                this.cameraMeta,
                DESCRIPTORS.Offset
            );

            if (cameraSlice && posSlice) {
                const camera = cameraSlice.arr;
                const pos = posSlice.arr;
                const off = offSlice?.arr;
                const size = sizeSlice?.arr;

                // Check if camera is enabled
                if (camera[cameraSlice.base + CameraIndex.ENABLED] === 1) {
                    cameraX = pos[posSlice.base + PositionIndex.X];
                    cameraY = pos[posSlice.base + PositionIndex.Y];
                    displayW = size
                        ? size[sizeSlice.base + SizeIndex.WIDTH]
                        : this.store.get("displayW");
                    displayH = size
                        ? size[sizeSlice.base + SizeIndex.HEIGHT]
                        : this.store.get("displayH");

                    // Calculate camera's top-left world position
                    const offX = off ? off[offSlice.base + OffsetIndex.X] : 0;
                    const offY = off ? off[offSlice.base + OffsetIndex.Y] : 0;
                    cameraX = cameraX - displayW * 0.5 + offX;
                    cameraY = cameraY - displayH * 0.5 + offY;
                }
            }
        } else {
            // Fallback: use first enabled camera (backward compatibility)
            view.forEachChunkWith([Component.Camera], (chunk) => {
                const pos = chunk.views.Position;
                const size = chunk.views.Size;
                const off = chunk.views.Offset;
                const camera = chunk.views.Camera;

                // Only use first enabled camera
                if (camera[CameraIndex.ENABLED] === 1) {
                    cameraX = pos[PositionIndex.X];
                    cameraY = pos[PositionIndex.Y];
                    displayW = size
                        ? size[SizeIndex.WIDTH]
                        : this.store.get("displayW");
                    displayH = size
                        ? size[SizeIndex.HEIGHT]
                        : this.store.get("displayH");

                    const offX = off ? off[OffsetIndex.X] : 0;
                    const offY = off ? off[OffsetIndex.Y] : 0;
                    cameraX = cameraX - displayW * 0.5 + offX;
                    cameraY = cameraY - displayH * 0.5 + offY;
                    return false; // Exit early after first camera
                }
            });
        }

        view.forEachChunkWith(
            [Component.Weapon, Component.Position, Component.Angle],
            (chunk) => {
                // only one player is expected
                if (chunk.count > 1) {
                    console.warn(
                        `[WeaponSystem]: more than one player is not allowed`
                    );
                }

                if (chunk.views.Weapon[WeaponIndex.ACTIVE] === 0) return;

                const pos = chunk.views.Position;
                const vel = chunk.views.Velocity;

                if (this.ownerPosition && this.ownerVelocity) {
                    pos[PositionIndex.X] = this.getOwnerX();
                    pos[PositionIndex.Y] = this.getOwnerY();
                    vel[VelocityIndex.X] = this.getOwnerVelocityX();
                    vel[VelocityIndex.Y] = this.getOwnerVelocityY();
                }

                // Convert player's world position to screen coordinates using actual camera position
                const scrX = pos[PositionIndex.X] - cameraX;
                const scrY = pos[PositionIndex.Y] - cameraY;

                const mx = Mouse.virtualPosition.x;
                const my = Mouse.virtualPosition.y;

                // Validate mouse position is within screen bounds
                if (mx < 0 || mx >= displayW || my < 0 || my >= displayH) {
                    return; // Don't update weapon angle if mouse is off-screen
                }

                chunk.views.Angle[AngleIndex.RADIANS] =
                    Cmath.angle(scrX, scrY, mx, my) + this.weaponRotationOffset;

                // update the weapon cooldown timer
                const weapon = chunk.views.Weapon;
                const size = chunk.views.Size;

                // for now assume infinite ammo
                weapon[WeaponIndex.LAST_FIRED] -= dt;
                if (weapon[WeaponIndex.LAST_FIRED] <= 0) {
                    // compute the muzzle position by taking the position of the weapon and shifting it by 16 along the normalised distance to the mouse cursor
                    this.cachedPosVec.set(scrX, scrY);
                    this.cachedTargetVec.set(mx, my);
                    this.cachedDirVec
                        .copy(this.cachedTargetVec)
                        .connect(this.cachedPosVec)
                        .reverse()
                        .normalize();

                    const scale = size ? size[SizeIndex.WIDTH] * 0.5 : 16;

                    this.store.emit<FireWeaponEvent>(
                        {
                            type: "fire-weapon",
                            data: {
                                cmd,
                                // world position of the weapon muzzle
                                position: {
                                    x:
                                        pos[PositionIndex.X] +
                                        this.cachedDirVec.x * scale,
                                    y:
                                        pos[PositionIndex.Y] +
                                        this.cachedDirVec.y * scale,
                                },
                                // normalized direction vector from weapon to mouse cursor
                                direction: {
                                    x: this.cachedDirVec.x,
                                    y: this.cachedDirVec.y,
                                },
                            },
                        },
                        false
                    );
                    // decrease ammo
                    if (weapon[WeaponIndex.AMMO] > 0) {
                        weapon[WeaponIndex.AMMO]--;
                    }
                    weapon[WeaponIndex.LAST_FIRED] =
                        weapon[WeaponIndex.COOLDOWN];
                }

                // DEBUG
                if (DEBUG_OVERLAY && this.db?.enabled) {
                    this.db.clear();
                    this.db.line(scrX, scrY, mx, my, 1, "yellow", 4);

                    this.db.text(
                        `Weapon Angle: ${chunk.views.Angle[
                            AngleIndex.RADIANS
                        ].toFixed(2)}°`,
                        10,
                        24,
                        "12px Arial",
                        "white"
                    );

                    this.db.text(
                        `Weapon Cooldown: ${weapon[
                            WeaponIndex.LAST_FIRED
                        ].toFixed(2)}s`,
                        10,
                        40,
                        "12px Arial",
                        "white"
                    );

                    // position of the weapon
                    this.db.dot(
                        this.cachedPosVec.x,
                        this.cachedPosVec.y,
                        4,
                        "red"
                    );

                    // text the direction vector
                    this.db.text(
                        `Direction: (${this.cachedDirVec.x.toFixed(
                            2
                        )}, ${this.cachedDirVec.y.toFixed(2)})`,
                        10,
                        56,
                        "12px Arial",
                        "white"
                    );
                }
            }
        );
    }

    private getOwnerX(): number {
        return this.ownerPosition!.arr[
            this.ownerPosition!.base + PositionIndex.X
        ];
    }

    private getOwnerY(): number {
        return this.ownerPosition!.arr[
            this.ownerPosition!.base + PositionIndex.Y
        ];
    }

    private getOwnerVelocityX(): number {
        return this.ownerVelocity!.arr[
            this.ownerVelocity!.base + VelocityIndex.X
        ];
    }

    private getOwnerVelocityY(): number {
        return this.ownerVelocity!.arr[
            this.ownerVelocity!.base + VelocityIndex.Y
        ];
    }

    public dispose(): void {
        this.ownerPosition = undefined;
        this.ownerVelocity = undefined;
        this.cachedPosVec.set(0, 0);
        this.cachedDirVec.set(0, 0);
        this.cachedTargetVec.set(0, 0);
        this.db?.dispose();
        this.db = undefined;
    }
}
