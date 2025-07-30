import { Archetype } from "../../../cluster/ecs/archetype";
import { DESCRIPTORS } from "../components";
import { Component } from "../components";
import { ComponentValueMap } from "../../../cluster/types";

export const cameraSchema = Archetype.register(
    DESCRIPTORS.Camera,
    DESCRIPTORS.Tracker,
    DESCRIPTORS.PreviousPosition,
    DESCRIPTORS.Position,
    DESCRIPTORS.Speed
);

export function getCameraComponents(): ComponentValueMap {
    return {
        [Component.Camera]: [1, 0, 0],
        [Component.Tracker]: [Component.Player, 0, 0], // means subjectIdx - subjectPositionX - subjectPositionY
        [Component.PreviousPosition]: [0, 0],
        [Component.Position]: [0, 0],
        [Component.Speed]: [100],
    } as ComponentValueMap;
}

export const cameraArchetype = Archetype.create("camera", cameraSchema, 1);
