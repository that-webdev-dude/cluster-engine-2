import { CommandBuffer } from "../../../cluster";
import { StoreEvent } from "../../../cluster";
import { Vector } from "../../../cluster";
import { EntityMeta } from "../../../cluster/types";

export type VectorLike = { x: number; y: number };

export type CollisionContact = {
    otherMeta: EntityMeta;
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
        dt?: number;
        cmd: CommandBuffer;
        mainMeta: EntityMeta;
        mainPos?: Float32Array;
        mainVel?: Float32Array;
        primary?: CollisionContact;
        secondary?: CollisionContact;
        tertiary?: CollisionContact;
    };
}
