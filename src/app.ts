import * as Cluster from "./cluster";
import * as Scenes from "./game/Scenes";

/**
 * game
 */
class MyGame extends Cluster.Game {
  constructor() {
    super();
    this.setScene(new Scenes.TitleScene());

    Cluster.Emitter.on("game-play", () => {
      const scene = new Scenes.GameScene();
      this.setScene(scene);
    });

    Cluster.Emitter.on("game-over", () => {
      const scene = new Scenes.TitleScene();
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
