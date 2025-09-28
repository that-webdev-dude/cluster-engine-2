import { EntityMeta } from "../../../cluster/types";
import {
    DebugOverlay,
    ECSUpdateSystem,
    CommandBuffer,
    Store,
    View,
} from "../../../cluster";
import { Component, DESCRIPTORS, PositionIndex } from "../components";
import { FireWeaponEvent } from "../events";
import { bulletArchetype, getBulletComponents } from "../entities/bullet";

const DEBUG_OVERLAY = false;

export class BulletSystem extends ECSUpdateSystem {
    private readonly db: DebugOverlay;

    private readonly worldW: number;
    private readonly worldH: number;
    private readonly displayW: number;
    private readonly displayH: number;

    constructor(readonly store: Store) {
        super(store);

        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");

        this.db = new DebugOverlay(
            store.get("displayW"),
            store.get("displayH"),
            200,
            DEBUG_OVERLAY
        );
    }

    prerun(view: View): void {
        this.store.on<FireWeaponEvent>(
            "fire-weapon",
            (e) => {
                const { cmd, position, direction } = e.data;
                const x = position.x;
                const y = position.y;
                const vx = direction.x * 600;
                const vy = direction.y * 600;
                const bullet = getBulletComponents(x, y, vx, vy);
                cmd.create(bulletArchetype, bullet);
            },
            false
        );
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (dt <= 0) return;

        view.forEachChunkWith(
            [Component.Bullet, Component.Position],
            (chunk, chunkId) => {
                if (chunk.count === 0) return;

                console.log(`BulletSystem: count ${chunk.count}`);

                // if the bullets go off world for now, destroy them
                // need to convert world to screen coords
                const pos = chunk.views.Position;

                for (let i = 0; i < chunk.count; i++) {
                    const px =
                        pos[PositionIndex.X + i * DESCRIPTORS.Position.count];
                    const py =
                        pos[PositionIndex.Y + i * DESCRIPTORS.Position.count];
                    if (
                        px < -64 ||
                        px > this.worldW + 64 ||
                        py < -64 ||
                        py > this.worldH + 64
                    ) {
                        const meta: EntityMeta = {
                            generation: chunk.getGeneration(i),
                            archetype: bulletArchetype,
                            chunkId,
                            row: i,
                        };
                        cmd.remove(meta);
                    }
                }
                // DEBUG
                if (this.db?.enabled) {
                    this.db.clear();

                    // text the bullet count
                    this.db.text(
                        `Bullets: ${chunk.count}`,
                        10,
                        20,
                        "16px Arial",
                        "white"
                    );
                }
            }
        );
    }
}
