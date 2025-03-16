import { Component } from "../../ecs/Component";
import { Vector } from "../../tools/Vector";
import { AnimationItem } from "../../tools/Animation";
import * as Types from "../types";

/**
 * Components in this file are:
 * - Position
 * - Anchor
 * - Angle
 * - Pivot
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
 * - Shadow
 * - Alpha
 * - Zindex
 * - Visibility
 * - Sprite
 * - Boundary
 * - Collision
 * - Dead
 * - Active
 * - Type
 * - Transition
 *
 * @flag components
 * - sleep
 */

export class Position extends Component {
  vector: Vector;
  constructor({ x, y }: Types.PositionOptions = { x: 0, y: 0 }) {
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

export class Anchor extends Component {
  vector: Vector;
  constructor({ x, y }: Types.AnchorOptions = { x: 0, y: 0 }) {
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
  constructor({ value }: Types.AngleOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Pivot extends Component {
  vector: Vector;
  constructor({ x, y }: Types.PivotOptions = { x: 0, y: 0 }) {
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
  constructor({ x, y }: Types.VelocityOptions = { x: 0, y: 0 }) {
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
  constructor({ x, y }: Types.AccelerationOptions = { x: 0, y: 0 }) {
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
  constructor({ value }: Types.MassOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Force extends Component {
  vector: Vector;
  constructor({ x, y }: Types.ForceOptions = { x: 0, y: 0 }) {
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
  constructor({ value }: Types.FrictionOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Drag extends Component {
  value: number;
  constructor({ value }: Types.DragOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Bounce extends Component {
  value: number;
  constructor({ value }: Types.BounceOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Gravity extends Component {
  value: number;
  constructor({ value }: Types.GravityOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Collider extends Component {
  radius: number;
  constructor({ radius }: Types.ColliderOptions = { radius: 0 }) {
    super();
    this.radius = radius;
  }
}

export class Rectangle extends Component {
  width: number;
  height: number;
  constructor(
    { width, height }: Types.RectangleOptions = { width: 0, height: 0 }
  ) {
    super();
    this.width = width;
    this.height = height;
  }
}

export class Size extends Component {
  width: number;
  height: number;
  constructor({ width, height }: Types.SizeOptions = { width: 0, height: 0 }) {
    super();
    this.width = width;
    this.height = height;
  }
}

export class Circle extends Component {
  radius: number;
  constructor({ radius }: Types.CircleOptions = { radius: 0 }) {
    super();
    this.radius = radius;
  }

  get width() {
    return this.radius * 2;
  }

  get height() {
    return this.radius * 2;
  }
}

export class Polygon extends Component {
  points: Vector[];
  constructor({ points }: Types.PolygonOptions = { points: [] }) {
    super();
    this.points = points;
  }

  get width() {
    return (
      Math.max(...this.points.map((point) => point.x)) -
      Math.min(...this.points.map((point) => point.x))
    );
  }

  get height() {
    return (
      Math.max(...this.points.map((point) => point.y)) -
      Math.min(...this.points.map((point) => point.y))
    );
  }
}

export class Vertices extends Component {
  points: Vector[];
  constructor({ points }: Types.VerticesOptions = { points: [] }) {
    super();
    this.points = points;
  }
  get width() {
    return (
      Math.max(...this.points.map((point) => point.x)) -
      Math.min(...this.points.map((point) => point.x))
    );
  }

  get height() {
    return (
      Math.max(...this.points.map((point) => point.y)) -
      Math.min(...this.points.map((point) => point.y))
    );
  }
}

export class Line extends Component {
  points: Vector[];
  constructor({ points }: Types.LineOptions = { points: [] }) {
    super();
    this.points = points;
  }
}

export class Image extends Component {
  src: string;
  constructor({ src }: Types.ImageOptions = { src: "" }) {
    super();
    this.src = src;
  }
}

export class Text extends Component {
  value: string;
  constructor({ value }: Types.TextOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Font extends Component {
  value: string;
  constructor({ value }: Types.FontOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Align extends Component {
  value: CanvasTextAlign;
  constructor({ value }: Types.AlignOptions = { value: "center" }) {
    super();
    this.value = value;
  }
}

export class Fill extends Component {
  value: string;
  constructor({ value }: Types.FillOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Stroke extends Component {
  value: string;
  width: number;
  constructor({ value, width }: Types.StrokeOptions = { value: "", width: 1 }) {
    super();
    this.value = value;
    this.width = width || 1;
  }
}

export class Shadow extends Component {
  value: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  constructor(
    { value, blur, offsetX, offsetY }: Types.ShadowOptions = {
      value: "transparent",
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    }
  ) {
    super();
    this.value = value;
    this.blur = blur;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }
}

export class Alpha extends Component {
  value: number;
  constructor({ value }: Types.AlphaOptions = { value: 1 }) {
    super();
    this.value = value;
  }
}

export class Zindex extends Component {
  value: number;
  constructor({ value }: Types.ZindexOptions = { value: 0 }) {
    super();
    this.value = value;
  }
}

export class Visibility extends Component {
  value: boolean;
  constructor({ value }: Types.VisibilityOptions = { value: true }) {
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

  constructor({
    image,
    frame,
    width,
    height,
    animations,
  }: Types.SpriteOptions) {
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
  behavior: Types.BoundaryBehavior;
  boundary: Types.BoundaryBox;
  constructor(
    { behavior, boundary }: Types.BoundaryOptions = {
      behavior: "contain",
      boundary: { x: 0, y: 0, width: 0, height: 0 },
    }
  ) {
    super();
    this.behavior = behavior;
    this.boundary = boundary;
  }
}

export class Collision extends Component {
  readonly data: Map<Types.CollisionResolverType, Types.CollisionData[]>;
  readonly mask: number;
  readonly layer: number;
  readonly radius: number | undefined;
  readonly hitbox: Types.CollisionHitbox | undefined;
  readonly resolvers: Types.CollisionResolver[];
  readonly detectable: boolean;

  constructor({
    layer,
    mask,
    hitbox,
    radius,
    resolvers,
    detectable,
  }: Types.CollisionOptions) {
    super();
    this.data = new Map();
    this.mask = mask || 0;
    this.layer = layer;
    this.hitbox = hitbox || undefined;
    this.radius = radius || undefined;
    this.resolvers = resolvers || [];
    this.detectable = detectable || true;
  }

  get hit() {
    return this.data.size > 0;
  }
}

export class Dead extends Component {
  value: boolean;
  constructor({ value }: Types.DeadOptions = { value: false }) {
    super();
    this.value = value;
  }
}

export class Active extends Component {
  value: boolean;
  constructor({ value }: Types.ActiveOptions = { value: true }) {
    super();
    this.value = value;
  }
}

export class Type extends Component {
  value: string;
  constructor({ value }: Types.TypeOptions = { value: "" }) {
    super();
    this.value = value;
  }
}

export class Transition extends Component {
  method: "fadeIn" | "fadeOut";
  duration: number;
  elapsed: number;
  progress: number;
  constructor({
    method,
    duration,
    elapsed,
    progress,
  }: Types.TransitionOptions) {
    super();
    this.method = method;
    this.duration = duration;
    this.elapsed = elapsed;
    this.progress = progress;
  }
}

/**
 * @flag components
 * - sleep
 */
export class Sleep extends Component {}
