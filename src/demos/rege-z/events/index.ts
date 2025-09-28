import { CommandBuffer, StoreEvent, View } from "../../../cluster";
import { AABB } from "../../../cluster/tools/aabb";
import { EntityMeta } from "../../../cluster/types";

export type VectorLike = { x: number; y: number };

export type CollisionContact = {
    otherMeta: EntityMeta;
    otherAABB: AABB;
    overlap: VectorLike; // (xWidth, yWidth), positive
    normal: VectorLike; // unit axis from other -> main
    depth: number; // min overlap along axis
    mtv: VectorLike; // normal * depth
    ndv: number; // max(0, dot(normal, v_main))
    area: number; // overlap.x * overlap.y
    axis: "x" | "y";
    eventType?: string; // optional: original per-target eventType
};

export interface CollisionEvent extends StoreEvent {
    type: string;
    data: {
        view?: View;
        cmd: CommandBuffer;
        dt: number;
        mainMeta: EntityMeta;
        mainAABB: AABB;
        primary?: CollisionContact;
        secondary?: CollisionContact;
        tertiary?: CollisionContact;
    };
}

// fire event (carries all the info to spawn a bullet like position, direction (for now))
export interface FireWeaponEvent extends StoreEvent {
    type: "fire-weapon";
    data: {
        position: VectorLike;
        direction: VectorLike;
    };
}
