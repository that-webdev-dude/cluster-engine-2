// src/ecs/systems/CameraSystem.ts
import { System } from "../System";
import { World } from "../World";
import { CameraComponent } from "../components";
import { Keyboard } from "../../core/Input";
import { Mouse } from "../../core/Input";

export class CameraSystem implements System {
  private lastMousePos: { x: number; y: number } | null = null;
  private panSpeed = 500; // world‐units per second for keyboard panning

  constructor(private world: World) {}

  init() {
    // if no camera exists, create a default one
    const cameras = this.world.query(CameraComponent);
    if (cameras.length === 0) {
      const mainCamera = this.world.createEntity();

      // TODO:
      // the camera dimensions should really come from some global viewport variable
      // for now it's just hardcoded to 800x600
      this.world.addComponent(mainCamera, new CameraComponent(0, 0, 800, 600));
    }
  }

  update(delta: number) {
    const ZOOM_SPEED = 1.5; // per second

    // 1) poll input
    Keyboard.update();
    Mouse.update();

    // 2) fetch the main camera
    const camId = this.world.query(CameraComponent)[0]!;
    const cam = this.world.getComponent(camId, CameraComponent)!;

    // 3) keyboard‐driven panning
    const kx = Keyboard.x(); // -1..+1
    const ky = Keyboard.y();
    cam.x += kx * this.panSpeed * delta;
    cam.y += ky * this.panSpeed * delta;

    // 4) mouse‐drag panning
    if (Mouse.isDown) {
      const m = Mouse.position;
      if (this.lastMousePos) {
        // compute how far the pointer moved since last frame
        const dx = m.x - this.lastMousePos.x;
        const dy = m.y - this.lastMousePos.y;
        // subtract because dragging right should move world left, etc.
        cam.x -= dx;
        cam.y -= dy;
      }
      // remember this frame’s mouse pos
      this.lastMousePos = { ...m };
    } else {
      // pointer released → reset
      this.lastMousePos = null;
    }

    // keyboard “+” (Equal) to zoom in, “-” (Minus) to zoom out
    if (Keyboard.key("Equal")) {
      cam.zoom *= 1 + ZOOM_SPEED * delta;
    }
    if (Keyboard.key("Minus")) {
      cam.zoom /= 1 + ZOOM_SPEED * delta;
    }
    // clamp so we don’t invert
    cam.zoom = Math.max(0.1, Math.min(cam.zoom, 10));
  }
}
