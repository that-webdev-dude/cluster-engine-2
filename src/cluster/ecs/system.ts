import { Store } from "../core/Store";
import { View } from "./scene";
import { CommandBuffer } from "./cmd";
import { GUIContainer } from "../gui";

/**
 * Abstract base class for systems that can be updated each frame.
 *
 * Classes extending `UpdateableSystem` must implement the `update` method,
 * which is called with the elapsed time since the last update.
 */
export abstract class UpdateableSystem {
    constructor(protected store: Store) {}
    abstract update(
        view: View,
        cmd: CommandBuffer,
        dt: number,
        t: number
    ): void;
}

/**
 * Abstract base class for systems that can be rendered each frame.
 *
 * Classes extending `RenderableSystem` must implement the `render` method,
 * which is called with an interpolation alpha value.
 */
export abstract class RenderableSystem {
    constructor(protected store: Store) {}
    abstract render(view: View, alpha: number): void;
}

/**
 * Abstract class for systems that can update the game UI
 */
export abstract class UIUpdateSystem {
    constructor(protected store: Store) {}
    abstract update(gui: GUIContainer, dt: number, t: number): void;
}

/**
 * Abstract class for systems that can render the game UI
 */
export abstract class UIRenderSystem {
    abstract render(gui: GUIContainer): void;
}
