import { Store } from "../core/Store";
import { View } from "./view";
import { CommandBuffer } from "./cmd";
import { GUIContainer } from "../gui/GUIbuilders";
import { ComponentDescriptor, ComponentSlice, EntityMeta } from "../types";

/**
 * Abstract base class for systems that can be updated each frame.
 */
abstract class BaseECSSystem {
    constructor(protected store: Store) {}
    prerun(view: View): void {
        // Optional hook with only View; subclasses may override.
    }

    // Returns a slice of the given component for the specified entity, or undefined if not found.
    protected getEntitySlice(
        view: View,
        meta: EntityMeta,
        desc: ComponentDescriptor
    ): ComponentSlice | undefined {
        const slice = view.getSlice(meta, desc);
        if (slice !== undefined) {
            return slice;
        }
        return undefined;
    }
}

export abstract class ECSUpdateSystem extends BaseECSSystem {
    // Per-frame update with full context.
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
export abstract class ECSRenderSystem extends BaseECSSystem {
    abstract render(view: View, alpha: number): void;
}

/**
 * Abstract class for systems that can update the game UI
 */
export abstract class GUIUpdateSystem {
    constructor(protected store?: Store) {}
    abstract update(gui: GUIContainer, dt: number, t: number): void;
}

/**
 * Abstract class for systems that can render the game UI
 */
export abstract class GUIRenderSystem {
    abstract render(gui: GUIContainer): void;
}
