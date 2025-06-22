import { UpdateableSystem } from "../../ecs/system";
import { CommandBuffer } from "../../ecs/cmd";
import { View } from "../../ecs/scene";
import { Renderer } from "../../gl/Renderer";
import { Component } from "../components";

export function degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

export class MovementSystem implements UpdateableSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        const renderer = Renderer.getInstance();
        view.forEachChunkWith(
            [
                Component.Position,
                Component.Velocity,
                Component.Size,
                Component.PreviousPosition,
            ],
            (chunk) => {
                for (let i = 0; i < chunk.count; i++) {
                    const vx = chunk.views.Velocity[i * 2];
                    const vy = chunk.views.Velocity[i * 2 + 1];

                    // Store previous position for smooth movement
                    chunk.views.PreviousPosition[i * 2] =
                        chunk.views.Position[i * 2];
                    chunk.views.PreviousPosition[i * 2 + 1] =
                        chunk.views.Position[i * 2 + 1];

                    // Update position
                    chunk.views.Position[i * 2] += vx * dt;
                    chunk.views.Position[i * 2 + 1] += vy * dt;

                    // Bounce off walls
                    const x = chunk.views.Position[i * 2];
                    const y = chunk.views.Position[i * 2 + 1];

                    if (
                        x < 0 ||
                        x + chunk.views.Size[i * 2] > renderer.worldWidth
                    ) {
                        chunk.views.Velocity[i * 2] *= -1; // Reverse horizontal velocity
                    }
                    if (
                        y < 0 ||
                        y + chunk.views.Size[i * 2 + 1] > renderer.worldHeight
                    ) {
                        chunk.views.Velocity[i * 2 + 1] *= -1; // Reverse vertical velocity
                    }
                }
            }
        );
    }
}
