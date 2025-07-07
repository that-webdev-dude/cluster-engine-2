import { View } from "./scene";
import { ViewV2 } from "./sceneV2";
import { CommandBuffer } from "./cmd";
import { CommandBufferV2 } from "./cmdV2";

/**
 * Abstract base class for systems that can be updated each frame.
 *
 * Classes extending `UpdateableSystem` must implement the `update` method,
 * which is called with the elapsed time since the last update.
 */
export abstract class UpdateableSystem {
    abstract update(view: View, cmd: CommandBuffer, dt: number): void;
}

/**
 * Abstract base class for systems that can be rendered each frame.
 *
 * Classes extending `RenderableSystem` must implement the `render` method,
 * which is called with an interpolation alpha value.
 */
export abstract class RenderableSystem {
    abstract render(view: View, alpha: number): void;
}

/**
 * Abstract base class for systems that can be updated each frame.
 *
 * Classes extending `UpdateableSystem` must implement the `update` method,
 * which is called with the elapsed time since the last update.
 */
export abstract class UpdateableSystemV2 {
    abstract update(view: ViewV2, cmd: CommandBufferV2, dt: number): void;
}

/**
 * Abstract base class for systems that can be rendered each frame.
 *
 * Classes extending `RenderableSystem` must implement the `render` method,
 * which is called with an interpolation alpha value.
 */
export abstract class RenderableSystemV2 {
    abstract render(view: ViewV2, alpha: number): void;
}
