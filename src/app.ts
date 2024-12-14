import * as Cluster from "./cluster";
import * as Scenes from "./game/Scenes";
import { Store } from "./game/Store";

/**
 * game
 */
class MyGame extends Cluster.Game {
  constructor() {
    super(Store);
    this.setScene(new Scenes.GameMenu());

    Store.on("game-play", () => {
      const scene = new Scenes.GamePlay();
      this.setScene(scene);
    });

    Store.on("game-over", () => {
      const scene = new Scenes.GameOver();
      this.setScene(scene);
    });

    Store.on("game-menu", () => {
      const scene = new Scenes.GameMenu();
      this.setScene(scene);
    });

    Store.on("game-win", () => {
      const scene = new Scenes.GameWin();
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
