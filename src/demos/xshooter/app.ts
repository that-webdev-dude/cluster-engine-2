import { GameV2 } from "../../cluster/ecs/gameV2";
import { createGamePlay } from "./scenes/gamePlay";

const game = new GameV2();

game.setScene(createGamePlay());

export function app() {
    game.start();
}
