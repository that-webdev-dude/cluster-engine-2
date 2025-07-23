import { Display } from "../core/Display";
import { Engine } from "../core/Engine";
import { Store } from "../core/Store";
import { Input } from "../core/Input";
import { Scene } from "./scene";

const displayDefaults = {
    width: 800,
    height: 400,
    parent: "#app",
    backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
};

export class Game {
    private engine: Engine = new Engine(60);
    private scenes: Array<Scene> = []; // a stack of Scene instances
    private debugUpdates: number = 2; // updates just two frames

    constructor(
        readonly store: Store = new Store({}),
        readonly display = Display.getInstance(displayDefaults)
    ) {
        Input.Mouse.element = this.display.canvasElement;
        Input.Mouse.setVirtualSize(
            this.display.worldWidth,
            this.display.worldHeight
        );
    }

    setScene(scene: Scene): void {
        const currentScene = this.scenes.pop();
        if (currentScene !== undefined) {
            currentScene.destroy();
        }
        // this.display.destroyRenderingLayers();
        scene.initialize();
        this.scenes.push(scene);
    }

    update(dt: number, t: number) {
        this.scenes.forEach((scene) => {
            if (scene.dialog !== undefined) {
                scene.dialog.storageUpdateSystems.forEach((system) => {
                    system.update(scene.dialog!.view, scene.dialog!.cmd, dt, t);
                });
                scene.dialog.guiUpdateSystems.forEach((system) => {
                    system.update(scene.dialog!.gui, dt, t);
                });
            } else {
                // update all the systems first
                scene.storageUpdateSystems.forEach((system) =>
                    system.update(scene.view, scene.cmd, dt, t)
                );
                // update the GUI
                scene.guiUpdateSystems.forEach((system) => {
                    system.update(scene.gui, dt, t);
                });
            }
        });
        Input.Mouse.update();
    }

    render(alpha: number) {
        this.scenes.forEach((scene) => {
            if (scene.dialog !== undefined) {
                console.log(
                    "🚀 ~ Game ~ this.scenes.forEach ~ scene.dialog:",
                    scene.dialog
                );
                // render the storage data
                scene.dialog.storageRenderSystems.forEach((system) => {
                    system.render(scene.dialog!.view, alpha);
                });
                // render the GUI
                scene.dialog.guiRenderSystems.forEach((system) => {
                    system.render(scene.dialog!.gui);
                });
            }
            // render the storage data
            scene.storageRenderSystems.forEach((system) => {
                system.render(
                    scene.view,
                    scene.dialog !== undefined ? 1 : alpha
                );
            });
            // render the GUI
            scene.guiRenderSystems.forEach((system) => {
                system.render(scene.gui);
            });
        });
        this.display.render();
    }

    done() {
        this.store.flush(); // resolves all the store events
        this.scenes.forEach((scene) => {
            scene.cmd.flush();
        });
        // this.debugUpdates++;
        // if (this.debugUpdates > 8) {
        //     this.stop();
        // }
    }

    start() {
        this.engine.addUpdateable(this);
        this.engine.addRenderable(this);
        this.engine.addCallback(this);
        this.engine.start();
    }

    stop() {
        this.engine.stop();
    }
}
