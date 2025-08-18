import { ECSUpdateSystem } from "../../../cluster";
import { CommandBuffer } from "../../../cluster";
import { Store } from "../../../cluster";
import { Cmath } from "../../../cluster";
import { Input } from "../../../cluster";
import { View } from "../../../cluster";
import { EntityMeta, Buffer } from "../../../cluster/types";
import { Component, DESCRIPTORS } from "../components";

const Mouse = Input.Mouse;

export class WeaponSystem extends ECSUpdateSystem {
    private ownerPosition: Buffer | undefined = undefined;
    private readonly worldW: number = 0;
    private readonly worldH: number = 0;
    private readonly displayW: number = 0;
    private readonly displayH: number = 0;

    constructor(readonly store: Store, readonly owner?: EntityMeta) {
        super(store);

        this.worldW = store.get("worldW");
        this.worldH = store.get("worldH");
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
    }

    prerun(view: View): void {
        if (this.owner && !this.ownerPosition) {
            const slice = view.getSlice<Float32Array>(
                this.owner,
                DESCRIPTORS["Position"]
            );

            if (slice !== undefined) {
                this.ownerPosition = slice.arr;
                return;
            }

            this.ownerPosition = new Float32Array(2);
        }
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (!this.ownerPosition)
            console.warn("[WeaponSustem]: this weapon has no owner");

        view.forEachChunkWith([Component.Weapon, Component.Angle], (chunk) => {
            // only one player is expected
            if (chunk.count > 1) {
                console.warn(
                    `[WeaponSystem]: more than one player is not allowed`
                );
            }

            if (chunk.views.Weapon[0] === 0) return;

            const pos = chunk.views.Position;
            if (this.ownerPosition) {
                pos[0] = this.ownerPosition[0];
                pos[1] = this.ownerPosition[1];
            }

            // 1. Center camera on player
            let camX = pos[0] - this.displayW / 2;
            // 2. Clamp camera to world bounds
            camX = Math.max(0, Math.min(camX, this.worldW - this.displayW));
            // 3. Convert player's world position to screen position
            const scrX = pos[0] - camX;

            // 1. Center camera on player
            let camY = pos[1] - this.displayH / 2;
            // 2. Clamp camera to world bounds
            camY = Math.max(0, Math.min(camY, this.worldH - this.displayH));
            // 3. Convert player's world position to screen position
            const scrY = pos[1] - camY;

            const mx = Mouse.virtualPosition.x;
            const my = Mouse.virtualPosition.y;

            chunk.views.Angle[0] =
                Cmath.angle(scrX, scrY, mx, my) + Math.PI / 2;
        });
    }
}
