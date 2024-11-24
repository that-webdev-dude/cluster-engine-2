import * as Globals from "./Globals";
import * as Entities from "./Entities";
import * as Systems from "./Systems";
import * as Events from "./Events";
import * as Components from "./Components";
import * as Cluster from "../cluster";

/**
 * scenes
 */
class TitleMainLayer extends Cluster.Entity {
  constructor() {
    super();

    const redBackground = new Entities.Rectangle(
      0,
      0,
      Globals.DISPLAY.width,
      Globals.DISPLAY.height,
      "transparent",
      "#FF6347",
      1
    );

    const titleText = new Entities.Text(
      Globals.DISPLAY.width / 2,
      Globals.DISPLAY.height / 2,
      "TITLE SCREEN",
      "24px 'Press Start 2P'",
      "white"
    );

    this.addChild(redBackground).addChild(titleText);
  }
}

export class TitleScene extends Cluster.Scene {
  constructor() {
    super();
    this.addLayer(new TitleMainLayer());
    this.addSystem(new Systems.TransitionSystem());
    this.addSystem(new Systems.RendererSystem());

    // add fade in transition
    this.layers.forEach((layer) => {
      const alpha = new Components.AlphaComponent();
      alpha.value = 1;
      const transition = new Components.TransitionComponent();
      transition.method = "fadeIn";
      transition.duration = 0.25;
      layer.addComponent(alpha);
      layer.addComponent(transition);
    });
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    if (Cluster.Keyboard.key("Enter") && this.active) {
      Cluster.Keyboard.active = false;

      this.layers.forEach((layer) => {
        const transition = new Components.TransitionComponent();
        transition.method = "fadeOut";
        transition.duration = 0.25;
        layer.addComponent(transition);
      });

      const event: Events.GamePlayEvent = { type: "game-play" };
      Cluster.Emitter.emit(event);
    }
  }
}

class GameMainLayer extends Cluster.Entity {
  constructor() {
    super();

    const blueBackground = new Entities.Rectangle(
      0,
      0,
      Globals.DISPLAY.width,
      Globals.DISPLAY.height,
      "transparent",
      "#1E90FF",
      1
    );

    const gameText = new Entities.Text(
      Globals.DISPLAY.width / 2,
      Globals.DISPLAY.height / 2,
      "GAME SCREEN",
      "24px 'Press Start 2P'",
      "white"
    );

    const player = new Entities.Player(
      Globals.DISPLAY.width / 2 - 16,
      Globals.DISPLAY.height / 2 + 64
    );

    this.addChild(blueBackground).addChild(gameText).addChild(player);
  }
}

class GameDialogLayer extends Cluster.Entity {
  constructor() {
    super();

    const dialogBackground = new Entities.Rectangle(
      100,
      100,
      Globals.DISPLAY.width - 200,
      Globals.DISPLAY.height - 200,
      "transparent",
      "black",
      0.9
    );

    const dialogText = new Entities.Text(
      Globals.DISPLAY.width / 2,
      Globals.DISPLAY.height / 2,
      "Paused",
      "24px 'Press Start 2P'",
      "white"
    );

    this.addChild(dialogBackground).addChild(dialogText);
  }
}

export class GameScene extends Cluster.Scene {
  private _paused: boolean = false;

  constructor() {
    super();
    this.addLayer(new GameMainLayer());
    this.addSystem(new Systems.TransitionSystem());
    this.addSystem(new Systems.PlayerSystem());
    this.addSystem(new Systems.RendererSystem());

    // add fade in transition
    this.layers.forEach((layer) => {
      const alpha = new Components.AlphaComponent();
      alpha.value = 1;
      const transition = new Components.TransitionComponent();
      transition.method = "fadeIn";
      transition.duration = 0.25;
      layer.addComponent(alpha);
      layer.addComponent(transition);
    });
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    if (Cluster.Keyboard.key("Space") && this.active) {
      Cluster.Keyboard.active = false;

      this.layers.forEach((layer) => {
        const transition = new Components.TransitionComponent();
        transition.method = "fadeOut";
        transition.duration = 0.25;
        layer.addComponent(transition);
      });

      const event: Events.GameOverEvent = { type: "game-over" };
      Cluster.Emitter.emit(event);
    }

    if (Cluster.Keyboard.key("KeyP") && !this._paused) {
      Cluster.Keyboard.active = false;
      this._paused = true;
      this.layers.forEach((layer) => {
        layer.active = false;
      });
      this.addLayer(new GameDialogLayer());
    }

    // exit from pause
    if (Cluster.Keyboard.key("KeyP") && this._paused) {
      Cluster.Keyboard.active = false;
      this._paused = false;
      this.layers.forEach((layer) => {
        layer.active = true;
        if (layer.type === "GameDialogLayer") this.removeLayer(layer);
      });
    }
  }
}
