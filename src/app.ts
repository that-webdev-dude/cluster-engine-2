import * as Cluster from "./cluster";
import * as Scenes from "./game/Scenes";
import { Store } from "./game/Store";

/**
 * game
 */
class MyGame extends Cluster.Game {
  constructor() {
    super(Store);

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

    this.setScene(new Scenes.GameMenu());
  }
}

export default () => {
  const game = new MyGame().start(() => {});
};
