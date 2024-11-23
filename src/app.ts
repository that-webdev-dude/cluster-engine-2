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

/**
 * global configuration
 */
const CONFIG = {
  width: 832,
  height: 640,
};

/**
 * components
 */
class PositionComponent extends Component {
  public x: number = 0;
  public y: number = 0;
}

class VelocityComponent extends Component {
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

class TextComponent extends Component {
  public value: string = "";
  public font: string = "16px Arial";
  public fill: string = "black";
}

class TransitionComponent extends Component {
  public method: "fadeIn" | "fadeOut" = "fadeIn";
  public duration: number = 0;
  public elapsed: number = 0;
  public progress: number = 0;
}

class PlayerComponent extends Component {
  public health: number = 100;
  public score: number = 0;
}

/**
 * systems
 */
class RendererSystem extends System {
  ctx: CanvasRenderingContext2D;

  constructor() {
    super();
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Canvas not found");

    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  update(entity: Entity, dt: number, t: number) {
    if (entity.dead) return;

    const position =
      entity.getComponent<PositionComponent>("PositionComponent") || undefined;
    const alpha =
      entity.getComponent<AlphaComponent>("AlphaComponent") || undefined;

    this.ctx.save();

    if (alpha) {
      this.ctx.globalAlpha *= Cmath.clamp(alpha.value, 0, 1);
    }

    if (position) {
      this.ctx.translate(position.x, position.y);
    }

    // render rectangle
    const size =
      entity.getComponent<SizeComponent>("SizeComponent") || undefined;
    const style =
      entity.getComponent<StyleComponent>("StyleComponent") || undefined;

    if (size && style) {
      this.ctx.fillStyle = style.fill;
      this.ctx.strokeStyle = style.stroke;
      this.ctx.strokeRect(0, 0, size.width, size.height);
      this.ctx.fillRect(0, 0, size.width, size.height);
    }

    // render text
    const text =
      entity.getComponent<TextComponent>("TextComponent") || undefined;

    if (text) {
      this.ctx.textAlign = "center";
      this.ctx.font = text.font;
      this.ctx.fillStyle = text.fill;
      this.ctx.fillText(text.value, 0, 0);
    }

    if (entity.children.size > 0) {
      entity.children.forEach((child) => {
        this.update(child, dt, t);
      });
    }

    this.ctx.restore();
  }
}

class TransitionSystem extends System {
  update(entity: Entity, dt: number, t: number) {
    const transition =
      entity.getComponent<TransitionComponent>("TransitionComponent") ||
      undefined;

    if (!transition) return;

    entity.active = false; // deactivate entity during transition

    if (transition.method === "fadeIn") {
      transition.elapsed += dt;
      transition.progress = transition.elapsed / transition.duration;

      const alpha = entity.getComponent<AlphaComponent>("AlphaComponent");
      if (alpha) alpha.value = transition.progress;

      if (transition.progress >= 1) {
        entity.removeComponent("TransitionComponent");
        entity.active = true; // activate entity after transition
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
        entity.active = true; // activate entity after transition
        entity.dead = true;
      }
    }
  }
}

class PlayerSystem extends System {
  update(entity: Entity, dt: number, t: number) {
    if (entity.dead || !entity.active) return;

    // just move the player up and down for now. bounce on screen when player touches the edge.
    const player = entity.getComponent<PlayerComponent>("PlayerComponent");

    if (player) {
      const position =
        entity.getComponent<PositionComponent>("PositionComponent");
      const velocity =
        entity.getComponent<VelocityComponent>("VelocityComponent");
      const size = entity.getComponent<SizeComponent>("SizeComponent");

      if (position && velocity && size) {
        position.y += velocity.y * dt;

        if (position.y < 0) {
          position.y = 0;
          velocity.y = -velocity.y;
        }

        if (position.y + size.height > CONFIG.height) {
          position.y = CONFIG.height - size.height;
          velocity.y = -velocity.y;
        }
      }
    }

    entity.children.forEach((child) => {
      this.update(child, dt, t);
    });
  }
}

/**
 * entities
 */
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

class Player extends Entity {
  constructor(x: number, y: number) {
    super();

    const player = new PlayerComponent();
    player.health = 100;
    player.score = 0;

    const position = new PositionComponent();
    position.x = x;
    position.y = y;

    const size = new SizeComponent();
    size.width = 32;
    size.height = 32;

    const style = new StyleComponent();
    style.stroke = "black";
    style.fill = "white";

    const velocity = new VelocityComponent();
    velocity.x = 0;
    velocity.y = 200;

    this.addComponent(player);
    this.addComponent(position);
    this.addComponent(size);
    this.addComponent(velocity);
    this.addComponent(style);
  }
}

class Text extends Entity {
  constructor(x: number, y: number, value: string, font: string, fill: string) {
    super();

    const position = new PositionComponent();
    position.x = x;
    position.y = y;

    const text = new TextComponent();
    text.value = value;
    text.font = font;
    text.fill = fill;

    this.addComponent(position);
    this.addComponent(text);
  }
}

/**
 * events
 */
interface GamePlayEvent extends Event {
  type: "game-play";
}

interface GameOverEvent extends Event {
  type: "game-over";
}

/**
 * scenes
 */
class TitleMainLayer extends Entity {
  constructor() {
    super();

    const redBackground = new Rectangle(
      0,
      0,
      CONFIG.width,
      CONFIG.height,
      "transparent",
      "#FF6347",
      1
    );

    const titleText = new Text(
      CONFIG.width / 2,
      CONFIG.height / 2,
      "TITLE SCREEN",
      "24px 'Press Start 2P'",
      "white"
    );

    this.addChild(redBackground).addChild(titleText);
  }
}

class TitleScene extends Scene {
  constructor() {
    super();
    this.addLayer(new TitleMainLayer());
    this.addSystem(new TransitionSystem());
    this.addSystem(new RendererSystem());

    // add fade in transition
    this.layers.forEach((layer) => {
      const alpha = new AlphaComponent();
      alpha.value = 1;
      const transition = new TransitionComponent();
      transition.method = "fadeIn";
      transition.duration = 0.25;
      layer.addComponent(alpha);
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
        transition.duration = 0.25;
        layer.addComponent(transition);
      });

      const event: GamePlayEvent = { type: "game-play" };
      Emitter.emit(event);
    }
  }
}

class GameMainLayer extends Entity {
  constructor() {
    super();

    const blueBackground = new Rectangle(
      0,
      0,
      CONFIG.width,
      CONFIG.height,
      "transparent",
      "#1E90FF",
      1
    );

    const gameText = new Text(
      CONFIG.width / 2,
      CONFIG.height / 2,
      "GAME SCREEN",
      "24px 'Press Start 2P'",
      "white"
    );

    const player = new Player(CONFIG.width / 2 - 16, CONFIG.height / 2 + 64);

    this.addChild(blueBackground).addChild(gameText).addChild(player);
  }
}

class GameDialogLayer extends Entity {
  constructor() {
    super();

    const dialogBackground = new Rectangle(
      100,
      100,
      CONFIG.width - 200,
      CONFIG.height - 200,
      "transparent",
      "black",
      0.9
    );

    const dialogText = new Text(
      CONFIG.width / 2,
      CONFIG.height / 2,
      "Paused",
      "24px 'Press Start 2P'",
      "white"
    );

    this.addChild(dialogBackground).addChild(dialogText);
  }
}

class GameScene extends Scene {
  private _paused: boolean = false;

  constructor() {
    super();
    this.addLayer(new GameMainLayer());
    this.addSystem(new TransitionSystem());
    this.addSystem(new PlayerSystem());
    this.addSystem(new RendererSystem());

    // add fade in transition
    this.layers.forEach((layer) => {
      const alpha = new AlphaComponent();
      alpha.value = 1;
      const transition = new TransitionComponent();
      transition.method = "fadeIn";
      transition.duration = 0.25;
      layer.addComponent(alpha);
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
        transition.duration = 0.25;
        layer.addComponent(transition);
      });

      const event: GameOverEvent = { type: "game-over" };
      Emitter.emit(event);
    }

    if (Keyboard.key("KeyP") && !this._paused) {
      Keyboard.active = false;
      this._paused = true;
      this.layers.forEach((layer) => {
        layer.active = false;
      });
      this.addLayer(new GameDialogLayer());
    }

    // exit from pause
    if (Keyboard.key("KeyP") && this._paused) {
      Keyboard.active = false;
      this._paused = false;
      this.layers.forEach((layer) => {
        layer.active = true;
        if (layer.type === "GameDialogLayer") this.removeLayer(layer);
      });
    }
  }
}

/**
 * game
 */
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
