import * as Cluster from "./cluster";
import * as Scenes from "./game/Scenes";
import { Store } from "./game/Store";

// console.log(Store.get("score"));

// Store.dispatch("incrementScore", 100);

// console.log(Store.get("score"));

// // Move event listener setup before emitting the event
// Store.on(
//   "game-over",
//   () => {
//     console.log("game-over");
//   },
//   true
// );

// const event: Events.GameOverEvent = { type: "game-over" };
// Store.emit(event, true);

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
