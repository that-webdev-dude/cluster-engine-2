import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    VelocityIndex,
    SpeedIndex,
    SizeIndex,
} from "../components";
import { View, Store, Vector } from "../../../cluster";
import { EntityMeta, Buffer } from "../../../cluster/types";
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
    private targetPos: Buffer | undefined = undefined;

    constructor(readonly store: Store, readonly target: EntityMeta) {
        super(store);
    }

    // this will run once when the scene is loaded
    prerun(view: View): void {
        // cache the view for this update cycle
        this.currentView = view;

        // stores the entityMeta of the target first
        if (this.targetPos === undefined) {
            const slice = view.getSlice(this.target, DESCRIPTORS.Position);
            if (slice !== undefined) {
                this.targetPos = slice.arr;
            }
        }

        // event handlers
        this.store.on<CollisionEvent>("zombie-zombie-collision", (e) => {
            const { mainMeta, primary } = e.data;
            if (!primary) return;

            // Move the player out of collision using the MTV
            const posSlice = this.currentView?.getSlice(
                mainMeta,
                DESCRIPTORS.Position
            );

            if (posSlice) {
                const { arr, base } = posSlice;
                arr[base + PositionIndex.X] += primary.mtv.x;
                arr[base + PositionIndex.Y] += primary.mtv.y;
            }
        });
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (!this.targetPos) return;

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

                for (let i = 0; i < chunk.count; i++) {
                    // reset the cached vector to store new values
                    const { mainPos, targPos, outVel } = this.scratch;
                    mainPos.set(0, 0);
                    targPos.set(0, 0);
                    outVel.set(0, 0);

                    // compute the velocity vector based on target position
                    let base = i * DESCRIPTORS.Position.count;
                    const mx = chunk.views.Position[base + PositionIndex.X];
                    const my = chunk.views.Position[base + PositionIndex.Y];

                    const tx = this.targetPos![0];
                    const ty = this.targetPos![1];

                    base = i * DESCRIPTORS.Speed.count;
                    const speed = chunk.views.Speed[base + SpeedIndex.VALUE];

                    mainPos.set(mx, my);
                    targPos.set(tx, ty);

                    outVel
                        .copy(mainPos)
                        .connect(targPos)
                        .normalize()
                        .scale(speed);

                    base = i * DESCRIPTORS.Velocity.count;
                    chunk.views.Velocity[base + VelocityIndex.X] = outVel.x;
                    chunk.views.Velocity[base + VelocityIndex.Y] = outVel.y;

                    // adjust the scale component to face the target based on velocityX sign
                    if (outVel.x !== 0) {
                        chunk.views.Size[base + SizeIndex.WIDTH] =
                            (outVel.x / Math.abs(outVel.x)) * 32;
                    }
                }
            }
        );
    }
}
