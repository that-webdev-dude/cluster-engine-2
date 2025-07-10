import { StoreEvent } from "../../../cluster/core/Store";
import { EntityId } from "../../../cluster/types";

export interface BulletDiedEvent extends StoreEvent {
    type: "bulletDied";
    data: {
        entityId: EntityId;
    };
}

export interface MeteorDiedEvent extends StoreEvent {
    type: "meteorDied";
    data: {
        entityId: EntityId;
    };
}

export interface PlayerDiedEvent extends StoreEvent {
    type: "playerDied";
    data: {
        entityId: EntityId;
    };
}
