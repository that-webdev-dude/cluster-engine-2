import { Engine } from "../core/Engine";
import { Scene } from "./scene";

export class Game {
    private engine: Engine = new Engine(60);
    private scenes: Array<Scene> = []; // a stack of Scene instances

    setScene(scene: Scene): void {
        scene.initialize();
        this.scenes.push(scene);
    }

    update(dt: number) {
        this.scenes.forEach((scene) => {
            scene.updateableSystems.forEach((system) =>
                system.update(scene.view, scene.cmd, dt)
            );
            scene.cmd.flush();
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
        // ...
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
