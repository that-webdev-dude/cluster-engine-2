import { Component, DESCRIPTORS } from "../components";
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

        store.on<CollisionEvent>("zombie-zombie-collision", (e) => {
            const { mainMeta, primary } = e.data;
            if (!primary) return;

            // Move the player out of collision using the MTV
            const posSlice = this.currentView?.getSlice(
                mainMeta,
                DESCRIPTORS.Position
            );

            if (posSlice) {
                const { arr, base } = posSlice;
                arr[base + 0] += primary.mtv.x;
                arr[base + 1] += primary.mtv.y;
            }
        });
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        // cache the view for this update cycle
        this.currentView = view;

        // stores the entityMeta of the target first
        if (this.targetPos === undefined) {
            const slice = view.getSlice(this.target, DESCRIPTORS.Position);
            if (slice !== undefined) {
                this.targetPos = slice.arr;
            }
        }

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
                    let base = i * 2;
                    const mx = chunk.views.Position[base + 0];
                    const my = chunk.views.Position[base + 1];

                    const tx = this.targetPos![0];
                    const ty = this.targetPos![1];

                    base = i * 1;
                    const speed = chunk.views.Speed[base + 0];

                    mainPos.set(mx, my);
                    targPos.set(tx, ty);

                    outVel
                        .copy(mainPos)
                        .connect(targPos)
                        .normalize()
                        .scale(speed);

                    base = i * 2;
                    chunk.views.Velocity[base + 0] = outVel.x;
                    chunk.views.Velocity[base + 1] = outVel.y;

                    // adjust the scale component to face the target based on velocityX sign
                    if (outVel.x !== 0) {
                        chunk.views.Size[base + 0] =
                            (outVel.x / Math.abs(outVel.x)) * 32;
                    }
                }
            }
        );
    }
}
