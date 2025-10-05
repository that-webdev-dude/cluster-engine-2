// NOSONAR
import { Display, Game } from "../../cluster";
import { createGamePlay } from "./scenes/gamePlay";
import { createGameTitle } from "./scenes/gameTitle";
import store from "./stores/store";

const width = store.get("displayW");
const height = store.get("displayH");
const parent = store.get("appId");
const display = Display.getInstance({
    width,
    height,
    parent,
    backgroundColor: {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
    },
});

export function app() {
    const game = new Game(store, display);

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

    game.setScene(createGameTitle());
    game.start();
}
