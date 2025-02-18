import { Component } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { Vector } from "../../tools/Vector";
import { AnimationItem } from "../../tools/Animation";

interface PositionOptions {
  x: number;
  y: number;
}

interface AngleOptions {
  value: number;
}

interface PivotOptions {
  x: number;
  y: number;
}

interface VelocityOptions {
  x: number;
  y: number;
}

interface AccelerationOptions {
  x: number;
  y: number;
}

interface MassOptions {
  value: number;
}

interface ForceOptions {
  x: number;
  y: number;
}

interface FrictionOptions {
  value: number;
}

interface DragOptions {
  value: number;
}

interface BounceOptions {
  value: number;
}

interface GravityOptions {
  value: number;
}

interface ColliderOptions {
  radius: number;
}

interface RectangleOptions {
  width: number;
  height: number;
}

interface SizeOptions {
  width: number;
  height: number;
}

interface CircleOptions {
  radius: number;
}

interface PolygonOptions {
  points: Vector[];
}

interface VerticesOptions {
  points: Vector[];
}

interface LineOptions {
  points: Vector[];
}

interface ImageOptions {
  src: string;
}

interface TextOptions {
  value: string;
}

interface FontOptions {
  value: string;
}

interface AlignOptions {
  value: CanvasTextAlign;
}

interface FillOptions {
  value: string;
}

interface StrokeOptions {
  value: string;
}

interface AlphaOptions {
  value: number;
}

interface ZindexOptions {
  value: number;
}

interface VisibilityOptions {
  value: boolean;
}

interface SpriteOptions {
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

interface BoundaryOptions {
  behavior: "contain" | "wrap" | "bounce" | "stop" | "die" | "slide";
}

interface CollisionOptions {
  layer: number;
  mask?: number;
  hitbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  resolvers?: {
    type: "bounce" | "die" | "stop" | "sleep" | "none" | "slide";
    mask: number;
  }[];
  detectable?: boolean;
}

/**
 * Components in this file are:
 * - Position
 * - Velocity
 * - Acceleration
 * - Mass
 * - Force
 * - Friction
 * - Drag
 * - Bounce
 * - Gravity
 * - Collider
 * - Rectangle
 * - Size
 * - Circle
 * - Polygon
 * - Vertices
 * - Line
 * - Image
 * - Text
 * - Font
 * - Align
 * - Fill
 * - Stroke
 * - Alpha
 * - Zindex
 * - Visibility
 * - Sprite
 */

export class Position extends Component {
  vector: Vector;
  constructor({ x, y }: PositionOptions = { x: 0, y: 0 }) {
    super();
    this.vector = new Vector(x, y);
  }

  get x() {
    return this.vector.x;
  }
  set x(value: number) {
    this.vector.x = value;
  }
  get y() {
    return this.vector.y;
  }
  set y(value: number) {
    this.vector.y = value;
  }
}

export class Angle extends Component {
  value: number;
  constructor({ value }: AngleOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Pivot extends Component {
  vector: Vector;
  constructor({ x, y }: PivotOptions = { x: 0, y: 0 }) {
    super();
    this.vector = new Vector(x, y);
  }

  get x() {
    return this.vector.x;
  }
  set x(value: number) {
    this.vector.x = value;
  }
  get y() {
    return this.vector.y;
  }
  set y(value: number) {
    this.vector.y = value;
  }
}

export class Velocity extends Component {
  vector: Vector;
  constructor({ x, y }: VelocityOptions = { x: 0, y: 0 }) {
    super();
    this.vector = new Vector(x, y);
  }

  get x() {
    return this.vector.x;
  }
  set x(value: number) {
    this.vector.x = value;
  }
  get y() {
    return this.vector.y;
  }
  set y(value: number) {
    this.vector.y = value;
  }
}

export class Acceleration extends Component {
  vector: Vector;
  constructor({ x, y }: AccelerationOptions = { x: 0, y: 0 }) {
    super();
    this.vector = new Vector(x, y);
  }

  get x() {
    return this.vector.x;
  }
  set x(value: number) {
    this.vector.x = value;
  }
  get y() {
    return this.vector.y;
  }
  set y(value: number) {
    this.vector.y = value;
  }
}

export class Mass extends Component {
  value: number;
  constructor({ value }: MassOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Force extends Component {
  vector: Vector;
  constructor({ x, y }: ForceOptions = { x: 0, y: 0 }) {
    super();
    this.vector = new Vector(x, y);
  }

  get x() {
    return this.vector.x;
  }
  set x(value: number) {
    this.vector.x = value;
  }
  get y() {
    return this.vector.y;
  }
  set y(value: number) {
    this.vector.y = value;
  }
}

export class Friction extends Component {
  value: number;
  constructor({ value }: FrictionOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Drag extends Component {
  value: number;
  constructor({ value }: DragOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Bounce extends Component {
  value: number;
  constructor({ value }: BounceOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Gravity extends Component {
  value: number;
  constructor({ value }: GravityOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Collider extends Component {
  radius: number;
  constructor({ radius }: ColliderOptions = { radius: 0 }) {
    super();
    this.radius = radius;
  }
}

export class Rectangle extends Component {
  width: number;
  height: number;
  constructor({ width, height }: RectangleOptions = { width: 0, height: 0 }) {
    super();
    this.width = width;
    this.height = height;
  }
}

export class Size extends Component {
  width: number;
  height: number;
  constructor({ width, height }: SizeOptions = { width: 0, height: 0 }) {
    super();
    this.width = width;
    this.height = height;
  }
}

export class Circle extends Component {
  radius: number;
  constructor({ radius }: CircleOptions = { radius: 0 }) {
    super();
    this.radius = radius;
  }
}

export class Polygon extends Component {
  points: Vector[];
  constructor({ points }: PolygonOptions = { points: [] }) {
    super();
    this.points = points;
  }
}

export class Vertices extends Component {
  points: Vector[];
  constructor({ points }: VerticesOptions = { points: [] }) {
    super();
    this.points = points;
  }
}

export class Line extends Component {
  points: Vector[];
  constructor({ points }: LineOptions = { points: [] }) {
    super();
    this.points = points;
  }
}

export class Image extends Component {
  src: string;
  constructor({ src }: ImageOptions = { src: "" }) {
    super();
    this.src = src;
  }
}

export class Text extends Component {
  value: string;
  constructor({ value }: TextOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Font extends Component {
  value: string;
  constructor({ value }: FontOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Align extends Component {
  value: CanvasTextAlign;
  constructor({ value }: AlignOptions = { value: "center" }) {
    super();
    this.value = value;
  }
}

export class Fill extends Component {
  value: string;
  constructor({ value }: FillOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Stroke extends Component {
  value: string;
  constructor({ value }: StrokeOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Alpha extends Component {
  value: number;
  constructor({ value }: AlphaOptions = { value: 1 }) {
    super();
    this.value = value;
  }
}

export class Zindex extends Component {
  value: number;
  constructor({ value }: ZindexOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Visibility extends Component {
  value: boolean;
  constructor({ value }: VisibilityOptions = { value: true }) {
    super();
    this.value = value;
  }
}

export class Sprite extends Component {
  image: HTMLImageElement;
  frame: number;
  width: number;
  height: number;
  animations: Map<string, AnimationItem>;
  currentAnimationName: string;

  constructor({ image, frame, width, height, animations }: SpriteOptions) {
    super();
    this.image = image;
    this.frame = frame || 0;
    this.width = width || this.image.width;
    this.height = height || this.image.height;

    this.animations = new Map();
    this.currentAnimationName = "";
    if (animations && animations.length) {
      animations.forEach(({ name, frames, rate }) => {
        this.animations.set(name, new AnimationItem(frames, rate));
      });
      this.currentAnimationName = animations[0].name;
    }
  }

  indexToCoords(index: number) {
    const cols = this.image.width / this.width;
    const x = (index % cols) * this.width;
    const y = Math.floor(index / cols) * this.height;
    return { x, y };
  }

  matrixToIndex(row: number, col: number) {
    return col * (this.image.width / this.width) + row;
  }
}

export class Boundary extends Component {
  behavior: "contain" | "wrap" | "bounce" | "stop" | "die" | "slide";
  constructor({ behavior }: BoundaryOptions = { behavior: "contain" }) {
    super();
    this.behavior = behavior;
  }
}

type CollisionData = {
  area: number;
  entity: Entity;
  normal: Vector;
  vector: Vector;
  overlap: Vector;
};

type CollisionHitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CollisionResolver = {
  type: CollisionResolverType;
  mask: number;
};

type CollisionResolverType =
  | "bounce"
  | "die"
  | "stop"
  | "sleep"
  | "none"
  | "slide";

export class Collision extends Component {
  readonly data: Map<CollisionResolverType, CollisionData[]>;
  readonly mask: number;
  readonly layer: number;
  readonly hitbox: CollisionHitbox;
  readonly resolvers: CollisionResolver[];
  public detectable: boolean;

  constructor({
    layer,
    mask,
    hitbox,
    resolvers,
    detectable,
  }: CollisionOptions) {
    super();
    this.data = new Map();
    this.mask = mask || 0;
    this.layer = layer;
    this.hitbox = hitbox;
    this.resolvers = resolvers || [];
    this.detectable = detectable || true;
  }

  get hit() {
    return this.data.size > 0;
  }
}
