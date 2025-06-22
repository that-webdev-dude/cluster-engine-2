import { Game } from "../../cluster/ecs/game";
import { createGamePlay } from "./scenes/gamePlay";

const game = new Game();

game.setScene(createGamePlay());

export function app() {
    game.start();
}
