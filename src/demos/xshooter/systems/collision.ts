import { StorageUpdateSystem } from "../../../cluster/ecs/system";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { View } from "../../../cluster/ecs/scene";
import { Component } from "../components";
import { meteorArchetype } from "../entities/meteor";
import { MeteorHitEvent } from "../events";

export class CollisionSystem extends StorageUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        // Gather meteor data
        const meteors: {
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

                    meteors.push({ chunkId, index: i, x, y, hw, hh });
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
                            // Collision detected: remove bullet and meteor
                            const bulletId = (cmd as any).scene.findEntityId(
                                chunk.archetype,
                                chunkId,
                                i
                            )[0];
                            const meteorId = (cmd as any).scene.findEntityId(
                                meteorArchetype,
                                meteor.chunkId,
                                meteor.index
                            )[0];

                            cmd.remove(bulletId);
                            cmd.remove(meteorId);

                            const event: MeteorHitEvent = {
                                type: "meteorHit",
                                data: { entityId: bulletId },
                            };

                            this.store.emit<MeteorHitEvent>(event, false);

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
                            console.warn("Player hit by meteor!");

                            // Could trigger death, scene transition, explosion, etc.
                            const playerId = (cmd as any).scene.findEntityId(
                                playerChunk.archetype,
                                playerChunkId,
                                pi
                            )[0];
                            cmd.remove(playerId); // or trigger game over logic

                            this.store.emit({ type: "gameTitle" }, false);
                            return;
                        }
                    }
                }
            }
        );
    }
}
