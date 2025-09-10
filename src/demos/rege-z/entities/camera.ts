import store from "../stores/store";
import { Archetype } from "../../../cluster/ecs/archetype";
import { DESCRIPTORS, Component } from "../components";
import { ComponentValueMap } from "../../../cluster/types";

export const cameraSchema = Archetype.register(
    DESCRIPTORS.Camera,
    DESCRIPTORS.Position,
    DESCRIPTORS.Size,
    DESCRIPTORS.PreviousPosition
);

export function getCameraComponents(): ComponentValueMap {
    const dw = store.get("displayW");
    const dh = store.get("displayH");
    const ww = store.get("worldW");
    const wh = store.get("worldH");

    return {
        // prettier-ignore
        [Component.Camera]: [
            0, 0,       // vx, vy,
            6, 4,     // omega
            0, 0,       // look ahead x and y
            128,         // look ahead maxOffset
            0.1        // look ahead decay
        ],
        [Component.PreviousPosition]: [ww / 2, wh / 2],
        [Component.Position]: [ww / 2, wh / 2],
        [Component.Size]: [dw, dh],
    } as ComponentValueMap;
}

export const cameraArchetype = Archetype.create("camera", cameraSchema, 1);
