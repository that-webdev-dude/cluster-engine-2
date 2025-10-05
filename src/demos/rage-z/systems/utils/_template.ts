import { EntityMeta, ComponentSlice } from "../../../../cluster/types";
import {
    DebugOverlay,
    ECSUpdateSystem,
    CommandBuffer,
    Store,
    Cmath,
    Input,
    View,
} from "../../../../cluster";
import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    AngleIndex,
    WeaponIndex,
    VelocityIndex,
    OffsetIndex,
    SizeIndex,
    CameraIndex,
} from "../../components";

const DEBUG_OVERLAY = false;

export class WeaponSystem extends ECSUpdateSystem {
    private readonly db: DebugOverlay;

    constructor(readonly store: Store) {
        super(store);

        this.db = new DebugOverlay(
            store.get("displayW"),
            store.get("displayH"),
            200,
            DEBUG_OVERLAY
        );
    }

    prerun(view: View): void {
        // ...
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (dt <= 0) return;

        view.forEachChunkWith(
            [
                /** Component.Position */
            ],
            (chunk) => {
                // DEBUG
                if (this.db?.enabled) {
                    // ... draw debug info
                }
            }
        );
    }
}
