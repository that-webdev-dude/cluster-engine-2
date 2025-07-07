import { Engine } from "../core/Engine";
import { SceneV2 } from "./sceneV2";

export class GameV2 {
    private engine: Engine = new Engine(60);
    private scenes: Array<SceneV2> = []; // a stack of SceneV2 instances

    setScene(scene: SceneV2): void {
        scene.initialize();
        this.scenes.push(scene);
    }

    update(dt: number) {
        this.scenes.forEach((scene) => {
            scene.updateableSystems.forEach((system) =>
                system.update(scene.view, scene.cmd, dt)
            );
        });
    }

    render(alpha: number) {
        this.scenes.forEach((scene) => {
            scene.renderableSystems.forEach((system) =>
                system.render(scene.view, alpha)
            );
        });
    }

    done() {
        this.scenes.forEach((scene) => {
            scene.cmd.flush();
        });
        // console.log("is running ...");
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
