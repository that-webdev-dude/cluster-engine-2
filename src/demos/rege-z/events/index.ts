import { CommandBuffer } from "../../../cluster";
import { StoreEvent } from "../../../cluster";
import { Vector } from "../../../cluster";
import { EntityId } from "../../../cluster/types";
import { EntityMeta } from "../../../cluster/types";

export interface CollisionEvent extends StoreEvent {
    type: string;
    data: {
        cmd: CommandBuffer;
        mainMeta: EntityMeta;
        otherMeta: EntityMeta;
        collisionVector: Vector;
        overlap: Vector;
    };
}
