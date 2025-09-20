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
    const cmx = cx - dw * 0.5;
    const cmy = cy - dh * 0.5;

    return {
        // Camera state (Float32Array):
        // [ springFreqX, springFreqY, lookAheadX, lookAheadY ]
        [Component.Camera]: [
            5, // springFreqX (Hz)
            5, // springFreqY (Hz)
            0, // lookAheadX (smoothed state)
            0, // lookAheadY (smoothed state)
        ],

        // Camera tunables (Float32Array):
        // [ deadZoneWPerc, deadZoneHPerc, lookAheadGainPerSec, lookAheadMaxOffset,
        //   lookAheadTau, deadBandEnter, deadBandExit, airborneYScale, flags ]
        [Component.CameraSettings]: [
            0.28, // deadZoneWPerc (28% of display width)
            0.2, // deadZoneHPerc (20% of display height)
            0.8, // lookAheadGainPerSec (lead factor)
            32, // lookAheadMaxOffset (px)
            0.08, // lookAheadTau (EMA smoothing, seconds)
            8, // deadBandEnter (px/s)
            10, // deadBandExit  (px/s)
            0.0, // airborneYScale (0 = disable Y look-ahead when airborne)
            0, // flags (bitfield, e.g., EnableYLookAhead, DebugOverlay)
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
