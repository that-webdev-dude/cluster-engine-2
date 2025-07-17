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
    private scenes: Array<Scene> = []; // a stack of SceneV2 instances

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
        scene.initialize();
        this.scenes.push(scene);
    }

    update(dt: number, t: number) {
        this.scenes.forEach((scene) => {
            // update all the systems first
            scene.storageUpdateSystems.forEach((system) =>
                system.update(scene.view, scene.cmd, dt, t)
            );
            // update the GUI
            scene.guiUpdateSystems.forEach((system) => {
                system.update(scene.gui, dt, t);
            });
        });
    }

    render(alpha: number) {
        this.scenes.forEach((scene) => {
            // render the storage data
            scene.storageRenderSystems.forEach((system) => {
                system.render(scene.view, alpha);
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
