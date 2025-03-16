import { Vector } from "../../tools/Vector";
import { EventEmitter } from "../../core/Emitter";

export type EntityID = number;

export type BoundaryBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BoundaryBehavior =
  | "contain"
  | "wrap"
  | "bounce"
  | "stop"
  | "die"
  | "slide"
  | "sleep";

export type CollisionData = {
  area: number;
  entity: EntityID;
  normal: Vector;
  vector: Vector;
  overlap: Vector;
  done: () => void;
};

export type CollisionHitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CollisionRadius = number;

export type CollisionResolver = {
  type: CollisionResolverType;
  mask: number;
  done?: () => void;
};

export type CollisionResolverType =
  | "bounce"
  | "die"
  | "stop"
  | "sleep"
  | "none"
  | "slide";

export interface PositionOptions {
  x: number;
  y: number;
}

export interface AnchorOptions {
  x: number;
  y: number;
}

export interface AngleOptions {
  value: number;
}

export interface PivotOptions {
  x: number;
  y: number;
}

export interface VelocityOptions {
  x: number;
  y: number;
}

export interface AccelerationOptions {
  x: number;
  y: number;
}

export interface MassOptions {
  value: number;
}

export interface ForceOptions {
  x: number;
  y: number;
}

export interface FrictionOptions {
  value: number;
}

export interface DragOptions {
  value: number;
}

export interface BounceOptions {
  value: number;
}

export interface GravityOptions {
  value: number;
}

export interface ColliderOptions {
  radius: number;
}

export interface RectangleOptions {
  width: number;
  height: number;
}

export interface SizeOptions {
  width: number;
  height: number;
}

export interface CircleOptions {
  radius: number;
}

export interface PolygonOptions {
  points: Vector[];
}

export interface VerticesOptions {
  points: Vector[];
}

export interface LineOptions {
  points: Vector[];
}

export interface ImageOptions {
  src: string;
}

export interface TextOptions {
  value: string;
}

export interface FontOptions {
  value: string;
}

export interface AlignOptions {
  value: CanvasTextAlign;
}

export interface FillOptions {
  value: string;
}

export interface StrokeOptions {
  value: string;
  width?: number;
}

export interface ShadowOptions {
  value: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface AlphaOptions {
  value: number;
}

export interface ZindexOptions {
  value: number;
}

export interface VisibilityOptions {
  value: boolean;
}

export interface SpriteOptions {
  image: HTMLImageElement;
  frame?: number;
  width?: number;
  height?: number;
  animations?: {
    name: string;
    frames: { x: number; y: number }[];
    rate: number;
  }[];
}

export interface BoundaryOptions {
  behavior: BoundaryBehavior;
  boundary: BoundaryBox;
}

export interface CollisionOptions {
  layer: number;
  mask?: number;
  hitbox?: CollisionHitbox;
  radius?: CollisionRadius;
  resolvers?: CollisionResolver[];
  detectable?: boolean;
}

export interface DeadOptions {
  value: boolean;
}

export interface ActiveOptions {
  value: boolean;
}

export interface TypeOptions {
  value: string;
}

export interface TransitionOptions {
  duration: number;
  method: "fadeIn" | "fadeOut";
  elapsed: number;
  progress: number;
}
