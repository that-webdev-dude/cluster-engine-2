import { Component } from "../../ecs/Component";
import { Vector } from "../../tools/Vector";

export class Position extends Component {
  constructor(public vector: Vector = new Vector()) {
    super();
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
    super();
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
    super();
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
    super();
  }
}

export class Force extends Component {
  constructor(public vector: Vector = new Vector()) {
    super();
  }
}

export class Friction extends Component {
  constructor(public value: number = 0) {
    super();
  }
}

export class Drag extends Component {
  constructor(public value: number = 0) {
    super();
  }
}

export class Bounce extends Component {
  constructor(public value: number = 0) {
    super();
  }
}

export class Gravity extends Component {
  constructor(public value: number = 0) {
    super();
  }
}

export class Collider extends Component {
  constructor(public radius: number = 0) {
    super();
  }
}

export class Rectangle extends Component {
  constructor(public width: number = 0, public height: number = 0) {
    super();
  }
}

export class Size extends Component {
  constructor(public width: number = 0, public height: number = 0) {
    super();
  }
}

export class Circle extends Component {
  constructor(public radius: number = 0) {
    super();
  }
}

export class Polygon extends Component {
  constructor(public points: Vector[] = []) {
    super();
  }
}

export class Line extends Component {
  constructor(
    public start: Vector = new Vector(),
    public end: Vector = new Vector()
  ) {
    super();
  }
}

export class Path extends Component {
  constructor(public points: Vector[] = []) {
    super();
  }
}

export class Image extends Component {
  constructor(public src: string = "") {
    super();
  }
}

export class Text extends Component {
  constructor(public value: string = "") {
    super();
  }
}

export class Font extends Component {
  constructor(public value: string = "") {
    super();
  }
}

export class Align extends Component {
  constructor(public value: CanvasTextAlign = "center") {
    super();
  }
}

export class Fill extends Component {
  constructor(public value: string = "") {
    super();
  }
}

export class Stroke extends Component {
  constructor(public value: string = "") {
    super();
  }
}

export class Alpha extends Component {
  constructor(public value: number = 1) {
    super();
  }
}

export class Zindex extends Component {
  constructor(public value: number = 0) {
    super();
  }
}

export class Visibility extends Component {
  constructor(public value: boolean = true) {
    super();
  }
}
