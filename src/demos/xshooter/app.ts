import { Game } from "../../cluster/ecs/game";
import { Display } from "../../cluster/core/Display";
import { createGamePlay } from "./scenes/gamePlay";
import { GLOBALS } from "./globals";
import { store } from "./stores";

export function app() {
    const display = Display.getInstance({
        width: GLOBALS.worldW,
        height: GLOBALS.worldH,
        parent: GLOBALS.appId,
        backgroundColor: {
            r: 0,
            g: 0,
            b: 0,
            a: 1,
        },
    });

    const game = new Game(store, display);
    game.setScene(createGamePlay());
    game.start();
}
