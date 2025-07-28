import { Display } from "../../cluster";
import { Game } from "../../cluster";
import { createGamePlay } from "./scenes/gamePlay";
import store from "./stores/store";

const width = store.get("worldW");
const height = store.get("worldH");
const parent = store.get("appId");

const display = Display.getInstance({
    width,
    height,
    parent,
    backgroundColor: {
        r: 255,
        g: 0,
        b: 0,
        a: 255,
    },
});

const game = new Game(store, display);

export function app() {
    game.setScene(createGamePlay());
    game.start();
}
