import { Engine } from "../core/Engine";
import { World } from "./world";

export class Game {
    private engine: Engine = new Engine(60);
    private worlds: Array<World> = []; // a stack of World instances

    setWorld(world: World): void {
        world.initialize();
        this.worlds.push(world);
    }

    update(dt: number) {
        this.worlds.forEach((world) => {
            world.updateableSystems.forEach((system) =>
                system.update(world.worldView, world.cmd, dt)
            );
            world.cmd.flush();
        });
    }

    render(alpha: number) {
        this.worlds.forEach((world) => {
            world.renderableSystems.forEach((system) =>
                system.render(world.worldView, alpha)
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
