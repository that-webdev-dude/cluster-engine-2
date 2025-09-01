import {
    View,
    Input,
    Store,
    CommandBuffer,
    ECSUpdateSystem,
} from "../../../cluster";
import { CollisionEvent } from "../events";
import { Component, DESCRIPTORS } from "../components";

export class PlayerSystem extends ECSUpdateSystem {
    private readonly worldW: number = 0;
    private readonly worldH: number = 0;
    private readonly displayW: number = 0;
    private readonly displayH: number = 0;

    // private currentView: View | undefined = undefined;
    // private isCollidingWithWall: boolean = false;
    // private collisionNormals: Array<{ x: number; y: number }> = [];

    constructor(readonly store: Store) {
        super(store);

        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
    }

    prerun(view: View): void {
        this.store.on<CollisionEvent>(
            "player-zombie-collision",
            (e) => {
                console.log("zombie collision");
            },
            false
        );

        this.store.on<CollisionEvent>(
            "player-wall-collision",
            (e) => {
                const { mainMeta, view, primary, secondary, tertiary } = e.data;
                if (!primary || !view) return;

                // Move the player out of collision using the MTV
                const posSlice = view.getSlice(mainMeta, DESCRIPTORS.Position);
                if (posSlice) {
                    const { arr, base } = posSlice;
                    arr[base + 0] += primary.mtv.x;
                    arr[base + 1] += primary.mtv.y;
                }

                // Prepare contacts (dedupe by axis)
                const contacts = [primary];
                if (secondary) contacts.push(secondary);
                if (tertiary) contacts.push(tertiary);

                const velSlice = view.getSlice(mainMeta, DESCRIPTORS.Velocity);
                if (velSlice) {
                    const { arr, base } = velSlice;
                    let vx = arr[base + 0];
                    let vy = arr[base + 1];

                    for (const c of contacts) {
                        const nx = c.normal.x;
                        const ny = c.normal.y;
                        const ndv = vx * nx + vy * ny; // velocity along normal (after previous projections)
                        if (ndv > 0) {
                            // subtract only if moving into the surface
                            vx -= ndv * nx;
                            vy -= ndv * ny;
                        }
                    }

                    arr[base + 0] = 0;
                    arr[base + 1] = 0;
                }
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
                    const col = chunk.views.Color;

                    // reset the color each frame
                    col[i * 4 + 0] = 255; // R
                    col[i * 4 + 1] = 255; // G
                    col[i * 4 + 2] = 255; // B
                    col[i * 4 + 3] = 255; // A

                    const inputX = Input.Keyboard.x();
                    const inputY = Input.Keyboard.y();

                    // Block input that would move into walls
                    let finalInputX = inputX;
                    let finalInputY = inputY;

                    // if (
                    //     this.isCollidingWithWall &&
                    //     this.collisionNormals.length
                    // ) {
                    //     for (const normal of this.collisionNormals) {
                    //         const dot = inputX * normal.x + inputY * normal.y;
                    //         if (dot > 0) {
                    //             // attempting to move further into wall; remove normal component
                    //             finalInputX -= dot * normal.x;
                    //             finalInputY -= dot * normal.y;
                    //         }
                    //     }
                    // }

                    // Update velocity based on filtered input
                    vel[i * 2 + 0] = finalInputX * 200;
                    vel[i * 2 + 1] = finalInputY * 200;

                    // Reset collision state if we're not moving into walls
                    // if (finalInputX === 0 && finalInputY === 0) {
                    //     this.isCollidingWithWall = false;
                    //     this.collisionNormals = [];
                    // }

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

                    let isWalking = finalInputX !== 0 || finalInputY !== 0;
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
