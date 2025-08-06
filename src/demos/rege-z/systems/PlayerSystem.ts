import { Component } from "../components";
import { View } from "../../../cluster";
import { Input } from "../../../cluster";
import { Store } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { ECSUpdateSystem } from "../../../cluster";
import { CollisionEvent } from "../events";

export class PlayerSystem extends ECSUpdateSystem {
    private worldW: number = 0;
    private worldH: number = 0;
    private displayW: number = 0;
    private displayH: number = 0;

    constructor(readonly store: Store) {
        super(store);

        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");

        store.on<CollisionEvent>(
            "player-zombie-collision",
            (e) => {
                console.log("zombie collision");
            },
            false
        );
        store.on<CollisionEvent>(
            "player-wall-collision",
            (e) => {
                console.log("wall collision");
            },
            false
        );
    }
    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [
                Component.Player,
                Component.Velocity,
                Component.Size,
                Component.Animation,
            ],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                if (chunk.views.Player[0] !== 1) return; // Ensure this is the player entity

                for (let i = 0; i < count; i++) {
                    const animation = chunk.views.Animation;
                    const scale = chunk.views.Size;
                    const pos = chunk.views.Position;
                    const vel = chunk.views.Velocity;

                    const inputX = Input.Keyboard.x();
                    const inputY = Input.Keyboard.y();

                    // Update velocity x and y based on input
                    vel[i * 2 + 0] = inputX * 200;
                    vel[i * 2 + 1] = inputY * 200;

                    // adjust the player's facing direction based on input
                    // 1. Center camera on player
                    let camX = pos[0] - this.displayW / 2;
                    // 2. Clamp camera to world bounds
                    camX = Math.max(
                        0,
                        Math.min(camX, this.worldW - this.displayW)
                    );
                    // 3. Convert player's world position to screen position
                    const scrX = pos[0] - camX;

                    const mx = Input.Mouse.virtualPosition.x;

                    if (mx - scrX > 0) {
                        scale[i * 2 + 0] = Math.abs(scale[i * 2 + 0]);
                    } else if (mx - scrX < 0) {
                        scale[i * 2 + 0] = -Math.abs(scale[i * 2 + 0]);
                    }

                    let isWalking = inputX !== 0 || inputY !== 0;
                    let currentStart = animation[i * 6 + 0];
                    let currentEnd = animation[i * 6 + 1];

                    // walking animation: frames 0–3
                    if (isWalking && (currentStart !== 0 || currentEnd !== 3)) {
                        animation[i * 6 + 0] = 0;
                        animation[i * 6 + 1] = 3;
                        animation[i * 6 + 2] = 0;
                        animation[i * 6 + 3] = 0.1;
                        animation[i * 6 + 4] = 0;
                        animation[i * 6 + 5] = 1;
                    }
                    // idle animation: frames 4–5
                    else if (
                        !isWalking &&
                        (currentStart !== 4 || currentEnd !== 5)
                    ) {
                        animation[i * 6 + 0] = 4;
                        animation[i * 6 + 1] = 5;
                        animation[i * 6 + 2] = 4;
                        animation[i * 6 + 3] = 0.2;
                        animation[i * 6 + 4] = 0;
                        animation[i * 6 + 5] = 1;
                    }

                    // Later, you could introduce a CurrentAnimation component that stores an enum (e.g. IDLE = 0, WALK = 1, etc.) and skip all this index-checking logic, which makes the code easier to manage.
                }
            }
        );
    }
}
