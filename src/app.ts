import {
  Game,
  Entity,
  Component,
  System,
  Scene,
  Keyboard,
  Emitter,
  Event,
  Cmath,
} from "./cluster";

// global config
const CONFIG = {
  width: 832,
  height: 640,
};

// components
class PositionComponent extends Component {
  public x: number = 0;
  public y: number = 0;
}

class SizeComponent extends Component {
  public width: number = 0;
  public height: number = 0;
}

class StyleComponent extends Component {
  public stroke: string = "black";
  public fill: string = "black";
}

class AlphaComponent extends Component {
  public value: number = 1;
}

class TransitionComponent extends Component {
  public method: "fadeIn" | "fadeOut" = "fadeIn";
  public duration: number = 0;
  public elapsed: number = 0;
  public progress: number = 0;
}

// systems
class RendererSystem extends System {
  ctx: CanvasRenderingContext2D;

  constructor() {
    super();
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Canvas not found");

    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  update(entity: Entity, dt: number, t: number) {
    // if (entity.dead) return;

    const position =
      entity.getComponent<PositionComponent>("PositionComponent") || undefined;
    const size =
      entity.getComponent<SizeComponent>("SizeComponent") || undefined;
    const style =
      entity.getComponent<StyleComponent>("StyleComponent") || undefined;

    if (!position || !size || !style) return;

    this.ctx.save();

    const alpha =
      entity.getComponent<AlphaComponent>("AlphaComponent") || undefined;
    if (alpha) this.ctx.globalAlpha = Cmath.clamp(alpha.value, 0, 1);

    this.ctx.fillStyle = style.fill;
    this.ctx.strokeStyle = style.stroke;
    this.ctx.strokeRect(position.x, position.y, size.width, size.height);
    this.ctx.fillRect(position.x, position.y, size.width, size.height);

    this.ctx.restore();
  }
}

class TransitionSystem extends System {
  update(entity: Entity, dt: number, t: number) {
    const transition =
      entity.getComponent<TransitionComponent>("TransitionComponent") ||
      undefined;

    if (!transition) return;

    entity.active = false;

    if (transition.method === "fadeIn") {
      transition.elapsed += dt;
      transition.progress = transition.elapsed / transition.duration;

      const alpha = entity.getComponent<AlphaComponent>("AlphaComponent");
      if (alpha) alpha.value = transition.progress;

      if (transition.progress >= 1) {
        entity.removeComponent("TransitionComponent");
        entity.active = true;
        entity.dead = false;
      }
    }

    if (transition.method === "fadeOut") {
      transition.elapsed += dt;
      transition.progress = transition.elapsed / transition.duration;

      const alpha = entity.getComponent<AlphaComponent>("AlphaComponent");
      if (alpha) alpha.value = 1 - transition.progress;

      if (transition.progress >= 1) {
        entity.removeComponent("TransitionComponent");
        entity.active = true;
        entity.dead = true;
      }
    }
  }
}

// entities
class Rectangle extends Entity {
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

    const position = new PositionComponent();
    position.x = x;
    position.y = y;

    const size = new SizeComponent();
    size.width = width;
    size.height = height;

    const style = new StyleComponent();
    style.stroke = stroke;
    style.fill = fill;

    const alpha = new AlphaComponent();
    alpha.value = opacity;

    this.addComponent(position);
    this.addComponent(size);
    this.addComponent(style);
    this.addComponent(alpha);
  }
}

// events
interface GamePlayEvent extends Event {
  type: "game-play";
}

interface GameOverEvent extends Event {
  type: "game-over";
}

// scenes
class TitleScene extends Scene {
  constructor() {
    super();
    const redBackgroundLayer = new Rectangle(
      0,
      0,
      CONFIG.width,
      CONFIG.height,
      "red",
      "red",
      5
    );

    this.addLayer(redBackgroundLayer);
    this.addSystem(new TransitionSystem());
    this.addSystem(new RendererSystem());

    // add fade in transition
    this.layers.forEach((layer) => {
      const transition = new TransitionComponent();
      transition.method = "fadeIn";
      transition.duration = 1;

      layer.addComponent(transition);
    });
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    if (Keyboard.key("Enter") && this.active) {
      Keyboard.active = false;

      this.layers.forEach((layer) => {
        const transition = new TransitionComponent();
        transition.method = "fadeOut";
        transition.duration = 1;

        layer.addComponent(transition);
      });

      const event: GamePlayEvent = { type: "game-play" };
      Emitter.emit(event);

      // this.active = false;
    }
  }
}

class GameScene extends Scene {
  constructor() {
    super();

    const blueBackgroundLayer = new Rectangle(
      0,
      0,
      CONFIG.width,
      CONFIG.height,
      "blue",
      "blue",
      5
    );

    this.addLayer(blueBackgroundLayer);
    this.addSystem(new TransitionSystem());
    this.addSystem(new RendererSystem());

    this.layers.forEach((layer) => {
      const transition = new TransitionComponent();
      transition.method = "fadeIn";
      transition.duration = 1;

      layer.addComponent(transition);
    });
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    if (Keyboard.key("Space") && this.active) {
      Keyboard.active = false;

      this.layers.forEach((layer) => {
        const transition = new TransitionComponent();
        transition.method = "fadeOut";
        transition.duration = 1;

        layer.addComponent(transition);
      });

      const event: GameOverEvent = { type: "game-over" };
      Emitter.emit(event);

      // this.active = false;
    }
  }
}

// game
class MyGame extends Game {
  constructor() {
    super();
    this.setScene(new TitleScene());

    Emitter.on("game-play", () => {
      const scene = new GameScene();
      this.setScene(scene);
    });

    Emitter.on("game-over", () => {
      const scene = new TitleScene();
      this.setScene(scene);
    });
  }
}

export default () => {
  const game = new MyGame();

  game.start((dt: number, t: number) => {
    // ...
  });
};
