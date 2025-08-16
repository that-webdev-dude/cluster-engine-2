import { Archetype, ECSUpdateSystem } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { View } from "../../../cluster";
import { Store } from "../../../cluster";
import { Vector } from "../../../cluster";
import { Component } from "../components";
import { CollisionEvent, CollisionContact } from "../events";
import { ComponentType, EntityMeta } from "../../../cluster/types";

export interface CollisionTarget {
    target: ComponentType;
    eventType: string;
}

export interface CollisionEventConfig {
    target: ComponentType;
    type: string;
}

export interface CollisionPairConfig {
    main: ComponentType;
    targets: CollisionTarget[];
}

export type CollisionConfig = CollisionPairConfig[];

export class CollisionSystem extends ECSUpdateSystem {
    constructor(store: Store, private readonly config?: CollisionConfig) {
        super(store);
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (!this.config) return;

        for (const collisionSpec of this.config) {
            const { main, targets } = collisionSpec;

            targets.forEach(({ target, eventType }) => {
                if (!eventType) return; // if there's nothing to emit skip the collision

                const targetDataArray: {
                    archetype: Archetype<any>;
                    generation: number;
                    chunkId: number;
                    row: number;
                    x: number;
                    y: number;
                    hw: number;
                    hh: number;
                }[] = [];

                // collect the targets
                view.forEachChunkWith(
                    [target, Component.Position, Component.Size],
                    (chunk, chunkId) => {
                        for (let i = 0; i < chunk.count; i++) {
                            const x = chunk.views.Position[i * 2 + 0];
                            const y = chunk.views.Position[i * 2 + 1];
                            const hw = Math.abs(
                                chunk.views.Size[i * 2 + 0] / 2
                            );
                            const hh = Math.abs(
                                chunk.views.Size[i * 2 + 1] / 2
                            );

                            const archetype = chunk.archetype;

                            const generation = chunk.getGeneration(i);

                            targetDataArray.push({
                                archetype,
                                generation,
                                chunkId,
                                row: i,
                                x,
                                y,
                                hw,
                                hh,
                            });
                        }
                    }
                );

                // Check main-target collisions
                view.forEachChunkWith(
                    [main, Component.Position, Component.Size],
                    (chunk, chunkId) => {
                        for (let i = 0; i < chunk.count; i++) {
                            const mx: number = chunk.views.Position[i * 2 + 0];
                            const my: number = chunk.views.Position[i * 2 + 1];
                            const mhw = Math.abs(
                                chunk.views.Size[i * 2 + 0] / 2
                            );
                            const mhh = Math.abs(
                                chunk.views.Size[i * 2 + 1] / 2
                            );

                            const collisionContacts: CollisionContact[] = [];

                            for (const target of targetDataArray) {
                                // AABB collision check
                                const lA = mx - mhw;
                                const rA = mx + mhw;
                                const tA = my - mhh;
                                const bA = my + mhh;

                                const lB = target.x - target.hw;
                                const rB = target.x + target.hw;
                                const tB = target.y - target.hh;
                                const bB = target.y + target.hh;

                                if (lA < rB && rA > lB && tA < bB && bA > tB) {
                                    const otherMeta: EntityMeta = {
                                        generation: target.generation,
                                        archetype: target.archetype,
                                        chunkId: target.chunkId,
                                        row: target.row,
                                    };

                                    // getCollisionOverlap
                                    const overlapX =
                                        Math.min(rA, rB) - Math.max(lA, lB);
                                    const overlapY =
                                        Math.min(bA, bB) - Math.max(tA, tB);

                                    const overlap = new Vector(
                                        overlapX,
                                        overlapY
                                    );

                                    // get the collision area
                                    const area = overlapX * overlapY;

                                    // Choose resolution axis
                                    const useX =
                                        Math.abs(overlapX) < Math.abs(overlapY);

                                    // Collision normal (unit axis from target -> main)
                                    const normal = useX
                                        ? new Vector(
                                              Math.sign(mx - target.x),
                                              0
                                          )
                                        : new Vector(
                                              0,
                                              Math.sign(my - target.y)
                                          );

                                    // Positive penetration depth along that axis
                                    const depth = useX ? overlapX : overlapY; // already positive

                                    // MTV to push 'main' out of 'target'
                                    const mtv = new Vector(
                                        normal.x * depth,
                                        normal.y * depth
                                    );

                                    // Velocity along normal: prefer explicit Velocity; else derive from PreviousPosition
                                    let vx = 0,
                                        vy = 0;
                                    const mv = (chunk.views as any).Velocity as
                                        | Float32Array
                                        | undefined;
                                    const prev = (chunk.views as any)
                                        .PreviousPosition as
                                        | Float32Array
                                        | undefined;
                                    if (mv) {
                                        vx = mv[i * 2 + 0];
                                        vy = mv[i * 2 + 1];
                                    } else if (prev && dt > 0) {
                                        vx = (mx - prev[i * 2 + 0]) / dt;
                                        vy = (my - prev[i * 2 + 1]) / dt;
                                    }

                                    // Dot with normal (speed toward contact)
                                    const ndv = normal.x * vx + normal.y * vy;

                                    // Optional TOI only if moving into the surface
                                    // const toi = ndv > 0 ? depth / ndv : 0;

                                    collisionContacts.push({
                                        otherMeta,
                                        overlap,
                                        normal,
                                        depth,
                                        mtv,
                                        ndv,
                                        area,
                                        axis: useX ? "x" : "y",
                                    });
                                }
                            }

                            if (collisionContacts.length === 0) continue;

                            const rankedCollisionContacts =
                                collisionContacts.sort((a, b) => {
                                    // primary: penetration depth
                                    if (Math.abs(b.depth - a.depth) > 0.001)
                                        return b.depth - a.depth;

                                    // secondary: contact area
                                    if (Math.abs(b.area - a.area) > 0.001)
                                        return b.area - a.area;

                                    // tertiary: velocity toward contact
                                    return b.ndv - a.ndv;
                                });

                            const primary = rankedCollisionContacts[0];
                            const secondary = rankedCollisionContacts[1];
                            const tertiary = rankedCollisionContacts[2];

                            if (primary) {
                                const mainMeta: EntityMeta = {
                                    generation: chunk.getGeneration(i),
                                    archetype: chunk.archetype,
                                    chunkId,
                                    row: i,
                                };

                                this.store.emit<CollisionEvent>({
                                    type: eventType,
                                    data: {
                                        cmd,
                                        mainMeta,
                                        primary,
                                        secondary,
                                        tertiary,
                                    },
                                });
                            }
                        }
                    }
                );
            });
        }
    }
}
