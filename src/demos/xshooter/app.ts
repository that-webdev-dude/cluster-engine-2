import { Game } from "../../cluster/ecs/game";
import { store } from "./stores";
import { createGamePlay } from "./scenes/gamePlay";
import { Renderer } from "../../cluster/gl/Renderer";
import { Display } from "../../cluster/core/Display";

const renderer = Renderer.getInstance();
console.log(renderer.width, renderer.height);

const display = new Display({
    parentID: "#app",
    width: renderer.cssWidth,
    height: renderer.cssHeight,
});

display.view.style.width = `${renderer.cssWidth}px`;
display.view.style.height = `${renderer.cssHeight}px`;
display.view.style.position = "absolute";
display.view.style.backgroundColor = "transparent";
display.view.style.border = "solid 2px red";

// const guiCanvas = document.createElement("canvas");
// // Set the actual pixel size of the canvas to match the renderer
// guiCanvas.width = renderer.width;
// guiCanvas.height = renderer.height;
// guiCanvas.style.width = `${renderer.cssWidth}px`;
// guiCanvas.style.height = `${renderer.cssHeight}px`;
// guiCanvas.style.position = "absolute";
// guiCanvas.style.backgroundColor = "transparent";
// guiCanvas.style.border = "solid 2px red";

// // const parent = renderer.canvasElement;
// const parent = document.querySelector("#app") as HTMLElement;
// parent.appendChild(guiCanvas);

// const ctx = guiCanvas.getContext("2d")!;
// ctx.font = "24px Arial";
// ctx.fillStyle = "white";
// ctx.fillText("Hello, X-Shooter!", 20, 40);

const game = new Game(store);

game.setScene(createGamePlay());

game.store.on("meteorDied", (e) => console.log("meteor is died"), false);

export function app() {
    game.start();
}
