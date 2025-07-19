import { StoreEvent } from "../../../cluster/core/Store";
import { EntityId } from "../../../cluster/types";

export interface BulletDiedEvent extends StoreEvent {
    type: "bulletDied";
    data: {
        entityId: EntityId;
    };
}

export interface MeteorHitEvent extends StoreEvent {
    type: "meteorHit";
    data: {
        entityId: EntityId;
    };
}

export interface ScoreEvent extends StoreEvent {
    type: "scoreEvent";
}

export interface PlayerDiedEvent extends StoreEvent {
    type: "playerDied";
    data: {
        entityId: EntityId;
    };
}

// game events
export interface GamePlayEvent extends StoreEvent {
    type: "gamePlay";
}
export interface GameTitleEvent extends StoreEvent {
    type: "gameTitle";
}
export interface GameOverEvent extends StoreEvent {
    type: "gameOver";
}
