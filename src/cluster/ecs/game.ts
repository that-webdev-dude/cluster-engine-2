import { Assets } from "../core/Assets";
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
    private debugUpdates: number = 10; // updates just two frames

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

    private runUpdateSystems(scene: Scene, dt: number, t: number) {
        scene.ECSUpdateSystems.forEach((system) => {
            system.update(scene!.view, scene!.cmd, dt, t);
        });
        scene.GUIUpdateSystems.forEach((system) => {
            system.update(scene!.gui, dt, t);
        });
    }

    private runRenderSystems(scene: Scene, alpha: number) {
        scene.ECSRenderSystems.forEach((system) => {
            system.render(scene!.view, scene.dialog !== undefined ? 1 : alpha);
        });
        // render the GUI
        scene.GUIRenderSystems.forEach((system) => {
            system.render(scene!.gui);
        });
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
                this.runUpdateSystems(scene.dialog, dt, t);
            } else {
                this.runUpdateSystems(scene, dt, t);
            }
        });
        Input.Mouse.update();
    }

    render(alpha: number) {
        this.scenes.forEach((scene) => {
            if (scene.dialog !== undefined) {
                this.runRenderSystems(scene.dialog, alpha);
            }
            this.runRenderSystems(scene, alpha);
        });
        this.display.render();
    }

    done() {
        this.store.flush(); // resolves all the store events
        this.scenes.forEach((scene) => {
            scene.cmd.flush();
        });
        this.debugUpdates++;
        if (this.debugUpdates > 1000) {
            this.stop();
        }
    }

    start() {
        this.engine.addUpdateable(this);
        this.engine.addRenderable(this);
        this.engine.addCallback(this);
        Assets.onReady(() => {
            this.engine.start();
        });
    }

    stop() {
        this.engine.stop();
    }
}
