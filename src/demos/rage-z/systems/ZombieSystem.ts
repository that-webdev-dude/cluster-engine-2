import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    VelocityIndex,
    SpeedIndex,
    SizeIndex,
} from "../components";
import { View, Store, Vector } from "../../../cluster";
import { ComponentSlice, EntityMeta } from "../../../cluster/types";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { CollisionEvent } from "../events";
import { ECSUpdateSystem } from "../../../cluster/ecs/system";

export class ZombieSystem extends ECSUpdateSystem {
    private currentView: View | undefined = undefined;

    private readonly scratch = {
        mainPos: new Vector(),
        targPos: new Vector(),
        outVel: new Vector(),
    };

    private targetPos: ComponentSlice | undefined = undefined;

    constructor(readonly store: Store, readonly target: EntityMeta) {
        super(store);
    }

    // this will run once when the scene is loaded
    prerun(view: View): void {
        // cache the view for this update cycle
        this.currentView = view;

        // stores the entityMeta of the target first
        this.targetPos ??= view.getSlice(this.target, DESCRIPTORS.Position);

        // event handlers
        this.store.on<CollisionEvent>(
            "zombie-wall-collision",
            (e) => {
                const {
                    mainMeta,
                    view: collisionView,
                    primary,
                    secondary,
                    tertiary,
                } = e.data;
                if (!primary) return;

                const activeView = collisionView ?? this.currentView;
                if (!activeView) return;

                const posSlice = activeView.getSlice(
                    mainMeta,
                    DESCRIPTORS.Position
                );
                if (posSlice) {
                    const { arr, base } = posSlice;
                    arr[base + PositionIndex.X] += primary.mtv.x;
                    arr[base + PositionIndex.Y] += primary.mtv.y;
                }

                const contacts = [primary];
                if (secondary) contacts.push(secondary);
                if (tertiary) contacts.push(tertiary);

                const velSlice = activeView.getSlice(
                    mainMeta,
                    DESCRIPTORS.Velocity
                );
                if (velSlice) {
                    const { arr, base } = velSlice;
                    let vx = arr[base + VelocityIndex.X];
                    let vy = arr[base + VelocityIndex.Y];

                    for (const contact of contacts) {
                        const nx = contact.normal.x;
                        const ny = contact.normal.y;
                        const ndv = vx * nx + vy * ny;
                        if (ndv > 0) {
                            vx -= ndv * nx;
                            vy -= ndv * ny;
                        }
                    }

                    arr[base + VelocityIndex.X] = vx;
                    arr[base + VelocityIndex.Y] = vy;
                }
            },
            false
        );

        this.store.on<CollisionEvent>(
            "zombie-bullet-collision",
            (e) => {
                const { cmd, mainMeta, primary } = e.data;
                if (!cmd) return;

                const meta: EntityMeta = {
                    archetype: mainMeta.archetype,
                    chunkId: mainMeta.chunkId,
                    row: mainMeta.row,
                    generation: mainMeta.generation,
                };

                cmd.remove(meta);

                const otherMeta = primary?.otherMeta;
                if (otherMeta) {
                    cmd.remove({
                        archetype: otherMeta.archetype,
                        chunkId: otherMeta.chunkId,
                        row: otherMeta.row,
                        generation: otherMeta.generation,
                    });
                }
            },
            false
        );
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        this.currentView = view;
        if (!this.targetPos) return;

        const posStride = DESCRIPTORS.Position.count;
        const velStride = DESCRIPTORS.Velocity.count;
        const sizeStride = DESCRIPTORS.Size.count;
        const speedStride = DESCRIPTORS.Speed.count;

        view.forEachChunkWith(
            [
                Component.Zombie,
                Component.Position,
                Component.Size,
                Component.Speed,
                Component.Velocity,
            ],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                const pos = chunk.views.Position;
                const vel = chunk.views.Velocity;
                const size = chunk.views.Size;
                const speed = chunk.views.Speed;

                const targetArr = this.targetPos!.arr;
                const targetBase = this.targetPos!.base;
                const tx = targetArr[targetBase + PositionIndex.X];
                const ty = targetArr[targetBase + PositionIndex.Y];

                for (let i = 0; i < count; i++) {
                    // reset the cached vector to store new values
                    const { mainPos, targPos, outVel } = this.scratch;
                    mainPos.set(0, 0);
                    targPos.set(0, 0);
                    outVel.set(0, 0);

                    // compute the velocity vector based on target position
                    const posBase = i * posStride;
                    const mx = pos[posBase + PositionIndex.X];
                    const my = pos[posBase + PositionIndex.Y];

                    const speedBase = i * speedStride;
                    const entitySpeed = speed[speedBase + SpeedIndex.VALUE];

                    mainPos.set(mx, my);
                    targPos.set(tx, ty);

                    outVel
                        .copy(mainPos)
                        .connect(targPos)
                        .normalize()
                        .scale(entitySpeed);

                    const velBase = i * velStride;
                    vel[velBase + VelocityIndex.X] = outVel.x;
                    vel[velBase + VelocityIndex.Y] = outVel.y;

                    // adjust the scale component to face the target based on velocityX sign
                    if (outVel.x !== 0) {
                        const sizeBase = i * sizeStride;
                        size[sizeBase + SizeIndex.WIDTH] =
                            (outVel.x / Math.abs(outVel.x)) * 32;
                    }
                }
            }
        );
    }

    public dispose(): void {
        this.currentView = undefined;
        this.targetPos = undefined;
        this.scratch.mainPos.set(0, 0);
        this.scratch.targPos.set(0, 0);
        this.scratch.outVel.set(0, 0);
    }
}
