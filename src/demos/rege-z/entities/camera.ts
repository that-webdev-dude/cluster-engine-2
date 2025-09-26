import store from "../stores/store";
import { Archetype } from "../../../cluster/ecs/archetype";
import { DESCRIPTORS, Component } from "../components";
import { ComponentValueMap } from "../../../cluster/types";

// Camera + CameraSettings + standard spatial components
export const cameraSchema = Archetype.register(
    DESCRIPTORS.Camera,
    DESCRIPTORS.CameraSettings,
    DESCRIPTORS.Position,
    DESCRIPTORS.Offset,
    DESCRIPTORS.Velocity,
    DESCRIPTORS.Size
);

export function getCameraComponents(): ComponentValueMap {
    const dw = store.get("displayW");
    const dh = store.get("displayH");
    const ww = store.get("worldW");
    const wh = store.get("worldH");

    // Center the camera on world center initially.
    const cx = ww * 0.5;
    const cy = wh * 0.5;

    return {
        // Camera state (Float32Array):
        [Component.Camera]: [
            1, // enabled
            0.25, // leadTime (seconds)
            64, // baseDistance (pixels)
            5, // speedCurveK
            400, // dirSharpness
            0.6, // enableSpeedEnter
            0.4, // enableSpeedExit
            180, // maxOffset (pixels)
            0.06, // fadeOnHalfLife (seconds)
            0.18, // fadeOffHalfLife (seconds)
            160, // teleportThreshold (pixels/frame)
            5000, // snapMaxSpeed (px/s)
        ],

        // Position: [x, y, prevX, prevY, minX, minY, maxX, maxY]
        [Component.Position]: [cx, cy, cx, cy, 0, 0, 0, 0],

        // Offset
        [Component.Offset]: [0, 0],

        // Velocity (px/s): [vx, vy]
        [Component.Velocity]: [0, 0],

        // Size (viewport size): [w, h]
        [Component.Size]: [dw, dh],
    } as ComponentValueMap;
}

export const cameraArchetype = Archetype.create("camera", cameraSchema, 1);
