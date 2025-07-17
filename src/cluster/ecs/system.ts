import { Store } from "../core/Store";
import { View } from "./scene";
import { CommandBuffer } from "./cmd";
import { GUIContainer } from "../gui";

/**
 * Abstract base class for systems that can be updated each frame.
 */
export abstract class StorageUpdateSystem {
    constructor(protected store: Store) {}
    abstract update(
        view: View,
        cmd: CommandBuffer,
        dt: number,
        t: number
    ): void;
}

/**
 * Abstract base class for systems that can render Chunks of data each frame.
 */
export abstract class StorageRenderSystem {
    abstract render(view: View, alpha: number): void;
}

/**
 * Abstract class for systems that can update the game UI
 */
export abstract class GUIUpdateSystem {
    constructor(protected store: Store) {}
    abstract update(gui: GUIContainer, dt: number, t: number): void;
}

/**
 * Abstract class for systems that can render the game UI
 */
export abstract class GUIRenderSystem {
    abstract render(gui: GUIContainer): void;
}
