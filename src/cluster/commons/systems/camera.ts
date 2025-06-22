import { UpdateableSystem } from "../../ecs/system";
import { CommandBuffer } from "../../ecs/cmd";
import { View } from "../../ecs/scene";
import { Renderer } from "../../gl/Renderer";
import { Component } from "../components";
import { Keyboard } from "../../core/Input";

export class CameraSystem implements UpdateableSystem {
    private keyboard = Keyboard;
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith([Component.Camera], (chunk) => {
            const i = 0; // single camera assumption

            // ✅ store PreviousPosition BEFORE updating Position
            chunk.views.PreviousPosition[i * 2] = chunk.views.Position[i * 2];
            chunk.views.PreviousPosition[i * 2 + 1] =
                chunk.views.Position[i * 2 + 1];

            const speed = chunk.views.Camera[i];
            chunk.views.Position[i * 2] += this.keyboard.x() * speed * dt;
            chunk.views.Position[i * 2 + 1] += this.keyboard.y() * speed * dt;
        });
    }
}
