import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Component } from "../components";
import { meteorArchetype } from "../entities/meteor";
import { BulletHitEvent, MeteorHitEvent, PlayerHitEvent } from "../events";
import { EntityMeta } from "../../../cluster/types";

export class CollisionSystem extends StorageUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        // Gather meteor data
        const meteors: {
            generation: number;
            chunkId: number;
            index: number;
            x: number;
            y: number;
            hw: number;
            hh: number;
        }[] = [];

        view.forEachChunkWith(
            [Component.Meteor, Component.Position, Component.Size],
            (chunk, chunkId) => {
                for (let i = 0; i < chunk.count; i++) {
                    const x = chunk.views.Position[i * 2];
                    const y = chunk.views.Position[i * 2 + 1];
                    const hw = chunk.views.Size[i * 2] / 2;
                    const hh = chunk.views.Size[i * 2 + 1] / 2;

                    const generation = chunk.getGeneration(i);

                    meteors.push({
                        generation,
                        chunkId,
                        index: i,
                        x,
                        y,
                        hw,
                        hh,
                    });
                }
            }
        );

        // Check Bullet-Meteor collisions
        view.forEachChunkWith(
            [Component.Bullet, Component.Position, Component.Size],
            (chunk, chunkId) => {
                for (let i = 0; i < chunk.count; i++) {
                    const bx = chunk.views.Position[i * 2];
                    const by = chunk.views.Position[i * 2 + 1];
                    const bhw = chunk.views.Size[i * 2] / 2;
                    const bhh = chunk.views.Size[i * 2 + 1] / 2;

                    for (const meteor of meteors) {
                        if (
                            Math.abs(bx - meteor.x) <= bhw + meteor.hw &&
                            Math.abs(by - meteor.y) <= bhh + meteor.hh
                        ) {
                            const bulletMeta: EntityMeta = {
                                generation: chunk.getGeneration(i),
                                archetype: chunk.archetype,
                                chunkId: chunkId,
                                row: i,
                            };

                            const meteorMeta: EntityMeta = {
                                generation: meteor.generation,
                                archetype: meteorArchetype,
                                chunkId: meteor.chunkId,
                                row: meteor.index,
                            };

                            const bulletHitEvent: BulletHitEvent = {
                                type: "bulletHit",
                                data: {
                                    cmd,
                                    bulletMeta,
                                    otherMeta: meteorMeta,
                                },
                            };

                            const meteorHitEvent: MeteorHitEvent = {
                                type: "meteorHit",
                                data: {
                                    cmd,
                                    meteorMeta,
                                    otherMeta: bulletMeta,
                                },
                            };

                            this.store.emit(bulletHitEvent, false);
                            this.store.emit(meteorHitEvent, false);

                            break; // move on to next bullet
                        }
                    }
                }
            }
        );

        // Check Meteor-Player collisions
        view.forEachChunkWith(
            [Component.Player, Component.Position, Component.Size],
            (playerChunk, playerChunkId) => {
                for (let pi = 0; pi < playerChunk.count; pi++) {
                    const px = playerChunk.views.Position[pi * 2];
                    const py = playerChunk.views.Position[pi * 2 + 1];
                    const phw = playerChunk.views.Size[pi * 2] / 2;
                    const phh = playerChunk.views.Size[pi * 2 + 1] / 2;

                    for (const meteor of meteors) {
                        if (
                            Math.abs(px - meteor.x) <= phw + meteor.hw &&
                            Math.abs(py - meteor.y) <= phh + meteor.hh
                        ) {
                            // console.warn("Player hit by meteor!");
                            // Could trigger death, scene transition, explosion, etc.
                            // const playerId = (cmd as any).scene.findEntityId(
                            //     playerChunk.archetype,
                            //     playerChunkId,
                            //     pi
                            // )[0];
                            // // this.store.emit({ type: "gameTitle" }, false);
                            // const meteorId = (cmd as any).scene.findEntityId(
                            //     meteorArchetype,
                            //     meteor.chunkId,
                            //     meteor.index
                            // )[0];
                            // cmd.remove(meteorId); // or trigger game over logic
                            // this.store.emit({ type: "playerHit" });
                            // return;
                            const playerMeta: EntityMeta = {
                                generation: playerChunk.getGeneration(pi),
                                archetype: playerChunk.archetype,
                                chunkId: playerChunkId,
                                row: pi,
                            };

                            const meteorMeta: EntityMeta = {
                                generation: meteor.generation,
                                archetype: meteorArchetype,
                                chunkId: meteor.chunkId,
                                row: meteor.index,
                            };

                            const playerHitEvent: PlayerHitEvent = {
                                type: "playerHit",
                                data: {
                                    cmd,
                                    playerMeta,
                                    otherMeta: meteorMeta,
                                },
                            };

                            const meteorHitEvent: MeteorHitEvent = {
                                type: "meteorHit",
                                data: {
                                    cmd,
                                    meteorMeta,
                                    otherMeta: playerMeta,
                                },
                            };

                            this.store.emit(playerHitEvent, false);
                            this.store.emit(meteorHitEvent, false);
                        }
                    }
                }
            }
        );
    }
}
