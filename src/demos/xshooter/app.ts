import { Game } from "../../cluster/ecs/game";
import { Display } from "../../cluster/core/Display";
import { createGamePlay } from "./scenes/gamePlay";
import { createGameTitle } from "./scenes/gameTitle";
import { GLOBALS } from "./globals";
import { store } from "./stores";
import { Assets } from "../../cluster";
import { gameplaySound } from "./sounds";

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

    // scene switch event
    store.on(
        "gamePlay",
        (e) => {
            store.dispatch("resetGame");
            game.setScene(createGamePlay());
        },
        false
    );

    store.on(
        "gameTitle",
        (e) => {
            game.setScene(createGameTitle());
        },
        false
    );

    const game = new Game(store, display);
    game.setScene(createGameTitle());
    game.start();
}
