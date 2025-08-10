import { Archetype, ECSUpdateSystem } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { View } from "../../../cluster";
import { Store } from "../../../cluster";
import { Vector } from "../../../cluster";
import { Component } from "../components";
import { CollisionEvent } from "../events";
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

// export class CollisionSystem extends ECSUpdateSystem {
//     private mVector = new Vector();
//     private tVector = new Vector();

//     constructor(store: Store, private readonly config?: CollisionConfig) {
//         super(store);
//     }

//     update(view: View, cmd: CommandBuffer, dt: number) {
//         if (!this.config) return;

//         for (const collisionSpec of this.config) {
//             const { main, targets } = collisionSpec;

//             targets.forEach(({ target, eventType }) => {
//                 const targetDataArray: {
//                     archetype: Archetype<any>;
//                     generation: number;
//                     chunkId: number;
//                     row: number;
//                     x: number;
//                     y: number;
//                     hw: number;
//                     hh: number;
//                 }[] = [];

//                 // collect the targets
//                 view.forEachChunkWith(
//                     [target, Component.Position, Component.Size],
//                     (chunk, chunkId) => {
//                         for (let i = 0; i < chunk.count; i++) {
//                             const x = chunk.views.Position[i * 2 + 0];
//                             const y = chunk.views.Position[i * 2 + 1];
//                             const hw = Math.abs(
//                                 chunk.views.Size[i * 2 + 0] / 2
//                             );
//                             const hh = Math.abs(
//                                 chunk.views.Size[i * 2 + 1] / 2
//                             );

//                             const archetype = chunk.archetype;

//                             const generation = chunk.getGeneration(i);

//                             targetDataArray.push({
//                                 archetype,
//                                 generation,
//                                 chunkId,
//                                 row: i,
//                                 x,
//                                 y,
//                                 hw,
//                                 hh,
//                             });
//                         }
//                     }
//                 );

//                 // Check main-target collisions
//                 view.forEachChunkWith(
//                     [main, Component.Position, Component.Size],
//                     (chunk, chunkId) => {
//                         for (let i = 0; i < chunk.count; i++) {
//                             const mx: number = chunk.views.Position[i * 2 + 0];
//                             const my: number = chunk.views.Position[i * 2 + 1];
//                             const mhw = Math.abs(
//                                 chunk.views.Size[i * 2 + 0] / 2
//                             );
//                             const mhh = Math.abs(
//                                 chunk.views.Size[i * 2 + 1] / 2
//                             );

//                             for (let target of targetDataArray) {
//                                 // AABB collision check
//                                 const lA = mx - mhw;
//                                 const rA = mx + mhw;
//                                 const tA = my - mhh;
//                                 const bA = my + mhh;

//                                 const lB = target.x - target.hw;
//                                 const rB = target.x + target.hw;
//                                 const tB = target.y - target.hh;
//                                 const bB = target.y + target.hh;

//                                 if (lA < rB && rA > lB && tA < bB && bA > tB) {
//                                     // emit a collision event
//                                     if (eventType !== undefined) {
//                                         const mainMeta: EntityMeta = {
//                                             generation: chunk.getGeneration(i),
//                                             archetype: chunk.archetype,
//                                             chunkId,
//                                             row: i,
//                                         };

//                                         const otherMeta: EntityMeta = {
//                                             generation: target.generation,
//                                             archetype: target.archetype,
//                                             chunkId: target.chunkId,
//                                             row: target.row,
//                                         };

//                                         // getCollisionVector
//                                         this.mVector.set(mx, my);
//                                         this.tVector.set(target.x, target.y);
//                                         const collisionVector = Vector.connect(
//                                             this.mVector,
//                                             this.tVector
//                                         );

//                                         // getCollisionOverlap
//                                         const overlapX =
//                                             Math.min(rA, rB) - Math.max(lA, lB);
//                                         const overlapY =
//                                             Math.min(bA, bB) - Math.max(tA, tB);
//                                         const overlap = new Vector(
//                                             overlapX,
//                                             overlapY
//                                         );

//                                         this.store.emit<CollisionEvent>(
//                                             {
//                                                 type: eventType,
//                                                 data: {
//                                                     cmd,
//                                                     mainMeta,
//                                                     otherMeta,
//                                                     collisionVector,
//                                                     overlap,
//                                                 },
//                                             },
//                                             false
//                                         );
//                                     }
//                                     break; // move on to next main entity
//                                 }
//                             }
//                         }
//                     }
//                 );
//             });
//         }
//     }
// }

export class CollisionSystem extends ECSUpdateSystem {
    private mVector = new Vector();
    private tVector = new Vector();

    constructor(store: Store, private readonly config?: CollisionConfig) {
        super(store);
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (!this.config) return;

        for (const collisionSpec of this.config) {
            const { main, targets } = collisionSpec;

            targets.forEach(({ target, eventType }) => {
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

                            for (let target of targetDataArray) {
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

                                        // getCollisionVector
                                        this.mVector.set(mx, my);
                                        this.tVector.set(target.x, target.y);
                                        const collisionVector = Vector.connect(
                                            this.mVector,
                                            this.tVector
                                        );

                                        // getCollisionOverlap
                                        // Calculate the overlap in both axes
                                        // This is the distance between the edges of the two rectangles
                                        // in the direction of the collision
                                        // If the rectangles are overlapping, this will be a negative value
                                        // If they are not overlapping, this will be a positive value
                                        // The overlap is the minimum of the absolute values of the overlaps in both axes
                                        const overlapX =
                                            Math.min(rA, rB) - Math.max(lA, lB);
                                        const overlapY =
                                            Math.min(bA, bB) - Math.max(tA, tB);
                                        const overlap = new Vector(
                                            overlapX,
                                            overlapY
                                        );

                                        const useX =
                                            Math.abs(overlapX) <
                                            Math.abs(overlapY);

                                        // Calculate the collision normal
                                        // The collision normal is the direction of the collision
                                        // It is a unit vector pointing from the target to the main entity
                                        const collisionNormal = useX
                                            ? new Vector(
                                                  Math.sign(mx - target.x),
                                                  0
                                              )
                                            : new Vector(
                                                  0,
                                                  Math.sign(my - target.y)
                                              );

                                        // Calculate the collision depth
                                        // This is the amount of overlap in the direction of the collision normal
                                        // It is the minimum of the absolute values of overlapX and overlapY
                                        const collisionDepth = useX
                                            ? Math.abs(overlapX)
                                            : Math.abs(overlapY);

                                        // Calculate the minimum translation vector (MTV)
                                        // This is the vector that will be used to resolve the collision
                                        // It is the collision normal scaled by the collision depth
                                        const collisionMTV = new Vector(
                                            collisionNormal.x * collisionDepth,
                                            collisionNormal.y * collisionDepth
                                        );

                                        // calculate the velocity projection onto the collisionNormal
                                        // This is used to determine if the entity is moving towards the collision
                                        // and to calculate the time of impact
                                        const mv = chunk.views.Velocity;
                                        const pPos = chunk.views.Position;
                                        const vx = mv
                                            ? mv[i * 2 + 0]
                                            : pPos
                                            ? mx - pPos[i * 2 + 0]
                                            : 0;
                                        const vy = mv
                                            ? mv[i * 2 + 1]
                                            : pPos
                                            ? my - pPos[i * 2 + 1]
                                            : 0;

                                        // calculate the dot product of the velocity and the collision normal
                                        // to determine the time of impact
                                        // if the dot product is zero, it means the entity is not moving towards the collision
                                        const normalDotVelocity = Vector.dot(
                                            collisionNormal,
                                            new Vector(vx, vy)
                                        );

                                        // if the dot product is negative, it means the entity is moving away from the collision
                                        const timeOfImpact =
                                            collisionDepth /
                                            Math.max(normalDotVelocity, 1e-6);

                                        this.store.emit<CollisionEvent>(
                                            {
                                                type: eventType,
                                                data: {
                                                    cmd,
                                                    mainMeta,
                                                    otherMeta,
                                                    collisionVector,
                                                    overlap,
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
