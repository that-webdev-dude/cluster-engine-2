import store from "../stores/store";
import { Archetype } from "../../../cluster/ecs/archetype";
import { DESCRIPTORS, Component } from "../components";
import { ComponentValueMap } from "../../../cluster/types";

export const cameraSchema = Archetype.register(
    DESCRIPTORS.Camera,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Size,
    DESCRIPTORS.Speed
);

export function getCameraComponents(): ComponentValueMap {
    const displayW = store.get("displayW");
    const displayH = store.get("displayH");

    return {
        [Component.Camera]: [1, 0, 0],
        [Component.PreviousPosition]: [0, 0],
        [Component.Position]: [0, 0],
        [Component.Size]: [displayW, displayH],
        [Component.Speed]: [100],
    } as ComponentValueMap;
}

export const cameraArchetype = Archetype.create("camera", cameraSchema, 1);
