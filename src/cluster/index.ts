/**
 * Cluster Engine 2 — public API barrel.
 * Grouped exports keep the surface area tidy and easy to scan.
 */

// ── Core ────────────────────────────────────────────────────────────────────
export { Assets, Audio, Display, Input, Sound, Store } from "./core";
export type { Action, Getter, Mutation, State, StoreEvent } from "./core/Store";

// ── ECS (Entity Component System) ───────────────────────────────────────────
export { Archetype } from "./ecs/archetype";
export { Chunk } from "./ecs/chunk";
export { Entity } from "./ecs/entity";
export { Game } from "./ecs/game";
export { Scene } from "./ecs/scene";
export {
    ECSRenderSystem,
    ECSUpdateSystem,
    GUIRenderSystem,
    GUIUpdateSystem,
} from "./ecs/system";
export type { CommandBuffer } from "./ecs/cmd";
export type { View } from "./ecs/view";

// ── GL Pipelines ───────────────────────────────────────────────────────────
export { CircleData, CirclePipeline } from "./gl/pipelines/circle";
export { MeshData, MeshPipeline } from "./gl/pipelines/mesh";
export { RectData, RectPipeline } from "./gl/pipelines/rect";
export { SpriteData, SpritePipeline } from "./gl/pipelines/sprite";

// ── Tools & Utilities ──────────────────────────────────────────────────────
export { Cmath } from "./tools/Cmath";
export { DebugOverlay } from "./tools/Debug";
export { Spritesheet } from "./tools/Spritesheet";
export { UniformGrid } from "./tools/Partitioner";
export { Vector } from "./tools/Vector";
export { AABB, AABBTools } from "./tools/aabb";

// ── GUI Helpers ────────────────────────────────────────────────────────────
export {
    GUIContainer,
    composeGUI,
    createGUIRect,
    createGUIText,
    withAlign,
    withAlpha,
    withAngle,
    withBaseline,
    withDeadState,
    withFill,
    withFont,
    withHeight,
    withIndex,
    withOffset,
    withPivot,
    withPosition,
    withScale,
    withTag,
    withText,
    withVisibility,
    withWidth,
} from "./gui/GUIbuilders";
export type {
    GUIBuilder,
    GUIContainerOptions,
    GUIElement,
    GUIRectElement,
    GUITextElement,
} from "./gui/GUIbuilders";

// ── Shared Types ───────────────────────────────────────────────────────────
export type { ComponentValueMap } from "./types";
