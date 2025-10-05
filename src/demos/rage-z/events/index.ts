import { CommandBuffer, StoreEvent, View, AABB } from "../../../cluster";
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
        cmd: CommandBuffer;
        position: VectorLike;
        direction: VectorLike;
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
