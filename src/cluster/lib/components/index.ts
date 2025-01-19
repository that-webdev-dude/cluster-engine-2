import { Component } from "../../core/ECS";
import { Vector } from "../../tools/Vector";

export class Position extends Component {
  constructor(public vector: Vector = new Vector()) {
    super("Position");
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
  constructor(public vector: Vector = new Vector()) {
    super("Velocity");
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
  constructor(public vector: Vector = new Vector()) {
    super("Acceleration");
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
  constructor(public value: number = 1) {
    super("Mass");
  }
}

export class Force extends Component {
  constructor(public vector: Vector = new Vector()) {
    super("Force");
  }
}

export class Friction extends Component {
  constructor(public value: number = 0) {
    super("Friction");
  }
}

export class Drag extends Component {
  constructor(public value: number = 0) {
    super("Drag");
  }
}

export class Bounce extends Component {
  constructor(public value: number = 0) {
    super("Bounce");
  }
}

export class Gravity extends Component {
  constructor(public value: number = 0) {
    super("Gravity");
  }
}

export class Collider extends Component {
  constructor(public radius: number = 0) {
    super("Collider");
  }
}

export class Rectangle extends Component {
  constructor(public width: number = 0, public height: number = 0) {
    super("Rectangle");
  }
}

export class Size extends Component {
  constructor(public width: number = 0, public height: number = 0) {
    super("Size");
  }
}

export class Circle extends Component {
  constructor(public radius: number = 0) {
    super("Circle");
  }
}

export class Polygon extends Component {
  constructor(public points: Vector[] = []) {
    super("Polygon");
  }
}

export class Line extends Component {
  constructor(
    public start: Vector = new Vector(),
    public end: Vector = new Vector()
  ) {
    super("Line");
  }
}

export class Path extends Component {
  constructor(public points: Vector[] = []) {
    super("Path");
  }
}

export class Image extends Component {
  constructor(public src: string = "") {
    super("Image");
  }
}

export class Text extends Component {
  constructor(public value: string = "") {
    super("Text");
  }
}

export class Font extends Component {
  constructor(public value: string = "") {
    super("Font");
  }
}

export class Align extends Component {
  constructor(public value: CanvasTextAlign = "center") {
    super("Align");
  }
}

export class Fill extends Component {
  constructor(public value: string = "") {
    super("Fill");
  }
}

export class Stroke extends Component {
  constructor(public value: string = "") {
    super("Stroke");
  }
}

export class Alpha extends Component {
  constructor(public value: number = 1) {
    super("Alpha");
  }
}

export class Zindex extends Component {
  constructor(public value: number = 0) {
    super("Zindex");
  }
}

export class Visibility extends Component {
  constructor(public value: boolean = true) {
    super("Visibility");
  }
}
