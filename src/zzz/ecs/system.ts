import { WorldView } from "./world";
import { CommandBuffer } from "./cmd";
/**
 * Abstract base class for systems that can be updated each frame.
 *
 * Classes extending `UpdateableSystem` must implement the `update` method,
 * which is called with the elapsed time since the last update.
 */
export abstract class UpdateableSystem {
    abstract update(view: WorldView, cmd: CommandBuffer, dt: number): void;
}

/**
 * Abstract base class for systems that can be rendered each frame.
 *
 * Classes extending `RenderableSystem` must implement the `render` method,
 * which is called with an interpolation alpha value.
 */
export abstract class RenderableSystem {
    abstract render(view: WorldView, alpha: number): void;
}
