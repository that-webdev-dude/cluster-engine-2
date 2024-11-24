import { Component } from "../cluster";

/**
 * components
 */
export class PositionComponent extends Component {
  public x: number = 0;
  public y: number = 0;
}

export class VelocityComponent extends Component {
  public x: number = 0;
  public y: number = 0;
}

export class SizeComponent extends Component {
  public width: number = 0;
  public height: number = 0;
}

export class StyleComponent extends Component {
  public stroke: string = "black";
  public fill: string = "black";
}

export class AlphaComponent extends Component {
  public value: number = 1;
}

export class TextComponent extends Component {
  public value: string = "";
  public font: string = "16px Arial";
  public fill: string = "black";
}

export class TransitionComponent extends Component {
  public method: "fadeIn" | "fadeOut" = "fadeIn";
  public duration: number = 0;
  public elapsed: number = 0;
  public progress: number = 0;
}

export class PlayerComponent extends Component {
  public health: number = 100;
  public score: number = 0;
}
