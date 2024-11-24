import * as Globals from "./Globals";
import * as Entities from "./Entities";
import * as Systems from "./Systems";
import * as Events from "./Events";
import * as Components from "./Components";
import * as Cluster from "../cluster";
import { Store } from "./Store";

class GameScene extends Cluster.Scene {
  protected paused: boolean = false;

  pause() {
    this.paused = true;
    this.layers.forEach((layer) => {
      layer.active = false;
    });
  }

  resume() {
    this.paused = false;
    this.layers.forEach((layer) => {
      layer.active = true;
    });
  }

  fadeIn() {
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

  fadeOut() {
    this.layers.forEach((layer) => {
      const transition = new Components.TransitionComponent();
      transition.method = "fadeOut";
      transition.duration = 0.25;
      layer.addComponent(transition);
    });
  }
}

/** Title Scene */
class GameMenuMainLayer extends Cluster.Entity {
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

export class GameMenu extends GameScene {
  constructor() {
    super();
    this.addLayer(new GameMenuMainLayer());
    this.addSystem(new Systems.TransitionSystem());
    this.addSystem(new Systems.RendererSystem());

    // add fade in transition
    this.fadeIn();
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    // transition to game play scene
    if (Cluster.Keyboard.key("Enter") && this.active) {
      Cluster.Keyboard.active = false;

      this.fadeOut();
      const event: Events.GamePlayEvent = { type: "game-play" };
      Store.emit(event);
    }
  }
}

/** Game Scene */
class GamePlayMainLayer extends Cluster.Entity {
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

class GamePlayUILayer extends Cluster.Entity {
  constructor() {
    super();

    const scoreText = new Entities.Text(
      16,
      16,
      `Score: ${Store.get("score")}`,
      "16px 'Press Start 2P'",
      "white",
      "left",
      "score"
    );

    this.addChild(scoreText);
  }
}

class GamePlayDialogLayer extends Cluster.Entity {
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

export class GamePlay extends GameScene {
  constructor() {
    super();
    this.addLayer(new GamePlayMainLayer());
    this.addLayer(new GamePlayUILayer());
    this.addSystem(new Systems.TransitionSystem());
    this.addSystem(new Systems.PlayerSystem());
    this.addSystem(new Systems.RendererSystem());

    // add fade in transition
    this.fadeIn();
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    // transition to game over scene
    if (Cluster.Keyboard.key("KeyX") && this.active) {
      Cluster.Keyboard.active = false;

      this.fadeOut();
      const event: Events.GameOverEvent = { type: "game-over" };
      Store.emit(event);
    }

    // transition to game win scene
    if (Cluster.Keyboard.key("KeyC") && this.active) {
      Cluster.Keyboard.active = false;

      this.fadeOut();
      const event: Events.GameWinEvent = { type: "game-win" };
      Store.emit(event);
    }

    // transition to game menu scene from the paused state
    if (Cluster.Keyboard.key("KeyQ") && this.paused) {
      Cluster.Keyboard.active = false;

      this.fadeOut();
      const event: Events.GameMenuEvent = { type: "game-menu" };
      Store.emit(event);
    }

    // pause
    if (Cluster.Keyboard.key("KeyP") && !this.paused) {
      Cluster.Keyboard.active = false;

      this.pause();
      this.addLayer(new GamePlayDialogLayer());
    }

    // resume
    if (Cluster.Keyboard.key("KeyP") && this.paused) {
      Cluster.Keyboard.active = false;

      this.resume();
      this.layers.forEach((layer) => {
        if (layer.type === "GamePlayDialogLayer") this.removeLayer(layer);
      });
    }
  }
}

/** Game Over Scene */
class GameOverMainLayer extends Cluster.Entity {
  constructor() {
    super();

    const greenBackground = new Entities.Rectangle(
      0,
      0,
      Globals.DISPLAY.width,
      Globals.DISPLAY.height,
      "transparent",
      "#32CD32",
      1
    );

    const gameOverText = new Entities.Text(
      Globals.DISPLAY.width / 2,
      Globals.DISPLAY.height / 2,
      "GAME OVER",
      "24px 'Press Start 2P'",
      "white"
    );

    this.addChild(greenBackground).addChild(gameOverText);
  }
}

export class GameOver extends GameScene {
  constructor() {
    super();
    this.addLayer(new GameOverMainLayer());
    this.addSystem(new Systems.TransitionSystem());
    this.addSystem(new Systems.RendererSystem());

    // add fade in transition
    this.fadeIn();
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    if (Cluster.Keyboard.key("Enter") && this.active) {
      Cluster.Keyboard.active = false;

      this.fadeOut();
      const event: Events.GameMenuEvent = { type: "game-menu" };
      Store.emit(event);
    }
  }
}

/** Game Win Scene */
class GameWinMainLayer extends Cluster.Entity {
  constructor() {
    super();

    const yellowBackground = new Entities.Rectangle(
      0,
      0,
      Globals.DISPLAY.width,
      Globals.DISPLAY.height,
      "transparent",
      "#FFD700",
      1
    );

    const gameWinText = new Entities.Text(
      Globals.DISPLAY.width / 2,
      Globals.DISPLAY.height / 2,
      "GAME WIN",
      "24px 'Press Start 2P'",
      "white"
    );

    this.addChild(yellowBackground).addChild(gameWinText);
  }
}

export class GameWin extends GameScene {
  constructor() {
    super();
    this.addLayer(new GameWinMainLayer());
    this.addSystem(new Systems.TransitionSystem());
    this.addSystem(new Systems.RendererSystem());

    // add fade in transition
    this.fadeIn();
  }

  update(dt: number, t: number) {
    super.update(dt, t);

    // transition to game menu scene
    if (Cluster.Keyboard.key("Enter") && this.active) {
      Cluster.Keyboard.active = false;

      this.fadeOut();
      const event: Events.GameMenuEvent = { type: "game-menu" };
      Store.emit(event);
    }
  }
}
