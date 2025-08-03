import { Archetype, ECSUpdateSystem } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { View } from "../../../cluster";
import { Component } from "../components";
import { ComponentType, EntityMeta } from "../../../cluster/types";
import { Store } from "../../../cluster";
import { CollisionEvent } from "../events";

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

            targets.forEach(({ target, eventType }) => {
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
                            const bx = chunk.views.Position[i * 2 + 0];
                            const by = chunk.views.Position[i * 2 + 1];
                            const bhw = Math.abs(
                                chunk.views.Size[i * 2 + 0] / 2
                            );
                            const bhh = Math.abs(
                                chunk.views.Size[i * 2 + 1] / 2
                            );

                            for (let target of targetDataArray) {
                                // AABB collision check
                                const lA = bx - bhw;
                                const rA = bx + bhw;
                                const tA = by - bhh;
                                const bA = by + bhh;

                                const lB = target.x - target.hw;
                                const rB = target.x + target.hw;
                                const tB = target.y - target.hh;
                                const bB = target.y + target.hh;

                                if (lA < rB && rA > lB && tA < bB && bA > tB) {
                                    // emit a collision event
                                    if (eventType !== undefined) {
                                        const mainMeta: EntityMeta = {
                                            generation: chunk.getGeneration(i),
                                            archetype: chunk.archetype,
                                            chunkId,
                                            row: i,
                                        };

                                        const otherMeta: EntityMeta = {
                                            generation: target.generation,
                                            archetype: target.archetype,
                                            chunkId: target.chunkId,
                                            row: target.row,
                                        };

                                        this.store.emit<CollisionEvent>(
                                            {
                                                type: eventType,
                                                data: {
                                                    cmd,
                                                    mainMeta,
                                                    otherMeta,
                                                },
                                            },
                                            false
                                        );
                                    }
                                    break; // move on to next main entity
                                }
                            }
                        }
                    }
                );
            });
        }
    }
}
