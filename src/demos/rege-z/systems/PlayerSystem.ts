import { Component } from "../components";
import { View } from "../../../cluster";
import { Input } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { StorageUpdateSystem } from "../../../cluster";

export class PlayerSystem extends StorageUpdateSystem {
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [Component.Player, Component.Animation],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                for (let i = 0; i < count; i++) {
                    const player = chunk.views.Player;
                    const animation = chunk.views.Animation;

                    if (Input.Keyboard.key("KeyA")) {
                        animation[i * 6 + 5] = 1; // Set animation to playing
                    } else {
                        animation[i * 6 + 5] = 0; // Set animation to not playing
                    }
                }
            }
        );
    }
}
