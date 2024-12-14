import * as Cluster from "../cluster";
import * as Components from "./Components";

/**
 * entities
 */
export class Rectangle extends Cluster.Entity {
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    stroke: string,
    fill: string,
    opacity: number
  ) {
    super();

    const position = new Components.PositionComponent();
    position.x = x;
    position.y = y;

    const size = new Components.SizeComponent();
    size.width = width;
    size.height = height;

    const style = new Components.StyleComponent();
    style.stroke = stroke;
    style.fill = fill;

    const alpha = new Components.AlphaComponent();
    alpha.value = opacity;

    this.addComponent(position);
    this.addComponent(size);
    this.addComponent(style);
    this.addComponent(alpha);
  }
}

export class Player extends Cluster.Entity {
  constructor(x: number, y: number) {
    super();

    const player = new Components.PlayerComponent();
    player.health = 100;
    player.score = 0;

    const position = new Components.PositionComponent();
    position.x = x;
    position.y = y;

    const size = new Components.SizeComponent();
    size.width = 32;
    size.height = 32;

    const style = new Components.StyleComponent();
    style.stroke = "black";
    style.fill = "white";

    const velocity = new Components.VelocityComponent();
    velocity.x = 0;
    velocity.y = 200;

    this.addComponent(player);
    this.addComponent(position);
    this.addComponent(size);
    this.addComponent(velocity);
    this.addComponent(style);
  }
}

export class Text extends Cluster.Entity {
  constructor(
    x: number,
    y: number,
    value: string,
    font: string,
    fill: string,
    align: CanvasTextAlign = "center",
    stored: string = ""
  ) {
    super();

    const position = new Components.PositionComponent();
    position.x = x;
    position.y = y;

    const text = new Components.TextComponent();
    text.value = value;
    text.font = font;
    text.fill = fill;
    text.align = align;
    text.stored = stored; // link to store value

    this.addComponent(position);
    this.addComponent(text);
  }
}
