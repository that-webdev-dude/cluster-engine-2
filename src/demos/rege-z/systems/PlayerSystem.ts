import {
    View,
    Input,
    Store,
    CommandBuffer,
    ECSUpdateSystem,
} from "../../../cluster";
import { CollisionEvent } from "../events";
import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    VelocityIndex,
    AnimationIndex,
    ColorIndex,
    SizeIndex,
} from "../components";

// implement dashing or teleporting here and watch the camera system behaviour

export class PlayerSystem extends ECSUpdateSystem {
    private readonly worldW: number = 0;
    private readonly worldH: number = 0;
    private readonly displayW: number = 0;
    private readonly displayH: number = 0;

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
                // ... do something when the player collides with a zombie
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
                    arr[base + PositionIndex.X] += primary.mtv.x;
                    arr[base + PositionIndex.Y] += primary.mtv.y;
                }

                // Prepare contacts (dedupe by axis)
                const contacts = [primary];
                if (secondary) contacts.push(secondary);
                if (tertiary) contacts.push(tertiary);

                const velSlice = view.getSlice(mainMeta, DESCRIPTORS.Velocity);
                if (velSlice) {
                    const { arr, base } = velSlice;
                    let vx = arr[base + VelocityIndex.X];
                    let vy = arr[base + VelocityIndex.Y];

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

                    arr[base + VelocityIndex.X] = 0;
                    arr[base + VelocityIndex.Y] = 0;
                }
            },
            false
        );
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        view.forEachChunkWith(
            [
                Component.Player,
                Component.Size,
                Component.Color,
                Component.Velocity,
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
                    const colBase = i * DESCRIPTORS.Color.count;
                    col[colBase + ColorIndex.R] = 255; // R
                    col[colBase + ColorIndex.G] = 255; // G
                    col[colBase + ColorIndex.B] = 255; // B
                    col[colBase + ColorIndex.A] = 255; // A

                    const inputX = Input.Keyboard.x();
                    const inputY = Input.Keyboard.y();

                    // Block input that would move into walls
                    let finalInputX = inputX;
                    let finalInputY = inputY;

                    // Update velocity based on filtered input
                    const velBase = i * DESCRIPTORS.Velocity.count;
                    vel[velBase + VelocityIndex.X] = finalInputX * 200;
                    vel[velBase + VelocityIndex.Y] = finalInputY * 200;

                    // adjust the player's facing direction based on input
                    // 1. Center camera on player
                    let camX = pos[PositionIndex.X] - this.displayW / 2;
                    // 2. Clamp camera to world bounds
                    camX = Math.max(
                        0,
                        Math.min(camX, this.worldW - this.displayW)
                    );
                    // 3. Convert player's world position to screen position
                    const scrX = pos[PositionIndex.X] - camX;

                    const mx = Input.Mouse.virtualPosition.x;

                    const scaleBase = i * DESCRIPTORS.Size.count;
                    if (mx - scrX > 0) {
                        scale[scaleBase + SizeIndex.WIDTH] = Math.abs(
                            scale[scaleBase + SizeIndex.WIDTH]
                        );
                    } else if (mx - scrX < 0) {
                        scale[scaleBase + SizeIndex.WIDTH] = -Math.abs(
                            scale[scaleBase + SizeIndex.WIDTH]
                        );
                    }

                    const animBase = i * DESCRIPTORS.Animation.count;
                    let isWalking = finalInputX !== 0 || finalInputY !== 0;
                    let currentStart =
                        animation[animBase + AnimationIndex.START];
                    let currentEnd = animation[animBase + AnimationIndex.END];

                    // walking animation: frames 0–3
                    if (isWalking && (currentStart !== 0 || currentEnd !== 3)) {
                        animation[animBase + AnimationIndex.START] = 0;
                        animation[animBase + AnimationIndex.END] = 3;
                        animation[animBase + AnimationIndex.CURRENT] = 0;
                        animation[animBase + AnimationIndex.TIME] = 0.1;
                        animation[animBase + AnimationIndex.ELAPSED] = 0;
                        animation[animBase + AnimationIndex.PLAYING] = 1;
                    }
                    // idle animation: frames 4–5
                    else if (
                        !isWalking &&
                        (currentStart !== 4 || currentEnd !== 5)
                    ) {
                        animation[animBase + AnimationIndex.START] = 4;
                        animation[animBase + AnimationIndex.END] = 5;
                        animation[animBase + AnimationIndex.CURRENT] = 4;
                        animation[animBase + AnimationIndex.TIME] = 0.2;
                        animation[animBase + AnimationIndex.ELAPSED] = 0;
                        animation[animBase + AnimationIndex.PLAYING] = 1;
                    }

                    // Later, you could introduce a CurrentAnimation component that stores an enum (e.g. IDLE = 0, WALK = 1, etc.) and skip all this index-checking logic, which makes the code easier to manage.
                }
            }
        );
    }
}
