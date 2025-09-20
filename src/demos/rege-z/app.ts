// NOSONAR
import { Display, Game } from "../../cluster";
import { createGamePlay } from "./scenes/gamePlay";
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

const game = new Game(store, display);
export function app() {
    game.setScene(createGamePlay());
    game.start();
}
