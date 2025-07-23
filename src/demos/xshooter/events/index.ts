import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { StoreEvent } from "../../../cluster/core/Store";
import { EntityId } from "../../../cluster/types";
import { EntityMeta } from "../../../cluster/types";

/**
 * bullet events
 */
export interface BulletHitEvent extends StoreEvent {
    type: "bulletHit";
    data: {
        cmd: CommandBuffer;
        bulletMeta: EntityMeta;
        otherMeta: EntityMeta;
    };
}

export interface BulletDiedEvent extends StoreEvent {
    type: "bulletDied";
    data: {
        cmd: CommandBuffer;
        bulletMeta: EntityMeta;
    };
}

/**
 * meteor events
 */
export interface MeteorHitEvent extends StoreEvent {
    type: "meteorHit";
    data: {
        cmd: CommandBuffer;
        meteorMeta: EntityMeta;
        otherMeta: EntityMeta;
    };
}

export interface MeteorDiedEvent extends StoreEvent {
    type: "meteorDied";
    data: {
        cmd: CommandBuffer;
        meteorMeta: EntityMeta;
    };
}

/**
 * player events
 */
export interface PlayerHitEvent extends StoreEvent {
    type: "playerHit";
    data: {
        cmd: CommandBuffer;
        playerMeta: EntityMeta;
        otherMeta: EntityMeta;
    };
}

export interface PlayerDiedEvent extends StoreEvent {
    type: "playerDied";
    data: {
        cmd: CommandBuffer;
        playerMeta: EntityMeta;
    };
}

/**
 * game events
 */
export interface ScoreEvent extends StoreEvent {
    type: "scoreEvent";
}

export interface GamePlayEvent extends StoreEvent {
    type: "gamePlay";
}

export interface GameTitleEvent extends StoreEvent {
    type: "gameTitle";
}

export interface GameOverEvent extends StoreEvent {
    type: "gameOver";
}

export interface GamePauseEvent extends StoreEvent {
    type: "gamePause";
}

export interface GameResumeEvent extends StoreEvent {
    type: "gameResume";
}
