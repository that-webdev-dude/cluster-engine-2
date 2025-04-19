import { Engine } from "./cluster/core/Engine";
import { Display } from "./cluster/core/Display";
import { Assets } from "./cluster/core/Assets";
import { RendererGL } from "./cluster/renderer/RendererGL";
import CharactersImageURL from "./images/characters.png";

interface SpriteInstance {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  pivotX: number; // in pixels
  pivotY: number; // in pixels
  offsetX: number;
  offsetY: number;
}

function dataPrep(
  instances: SpriteInstance[],
  imageWidth: number,
  imageHeight: number
): { data: Float32Array; count: number } {
  const count = instances.length;
  const FLOATS_PER_SPRITE = 14;
  const data = new Float32Array(count * FLOATS_PER_SPRITE);

  for (let i = 0; i < count; i++) {
    const s = instances[i];
    const base = i * FLOATS_PER_SPRITE;

    // UVs
    const u = s.frameX / imageWidth;
    const v = s.frameY / imageHeight;
    const uw = s.frameWidth / imageWidth;
    const vh = s.frameHeight / imageHeight;

    // normalized pivot
    const pivotNormX = s.pivotX / s.frameWidth;
    const pivotNormY = s.pivotY / s.frameHeight;

    data[base + 0] = s.x;
    data[base + 1] = s.y;
    data[base + 2] = s.rotation;
    data[base + 3] = s.scaleX * s.frameWidth;
    data[base + 4] = s.scaleY * s.frameHeight;
    data[base + 5] = 0;
    data[base + 6] = u;
    data[base + 7] = v;
    data[base + 8] = uw;
    data[base + 9] = vh;
    data[base + 10] = pivotNormX;
    data[base + 11] = pivotNormY;
    data[base + 12] = s.offsetX;
    data[base + 13] = s.offsetY;
  }

  return { data, count };
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// prepare one sprite instance for testing
const instances: SpriteInstance[] = [];
for (let i = 0; i < 10; i++) {
  instances.push({
    x: Math.random() * 800 - 32,
    y: Math.random() * 600 - 32,
    rotation: degreesToRadians(0),
    scaleX: 1,
    scaleY: 1,
    frameX: 0,
    frameY: 0,
    frameWidth: 32,
    frameHeight: 32,
    pivotX: 16,
    pivotY: 16,
    offsetX: 0,
    offsetY: 0,
  });
}

const charactersImage = Assets.image(CharactersImageURL);

export default () => {
  const SPEED = 100; // pixels per second
  const FLOATS_PER_SPRITE = 14;

  Assets.onReady(() => {
    const display = new Display({
      parentID: "#app",
      width: 834,
      height: 640,
    });

    const { data, count } = dataPrep(
      instances,
      charactersImage.width,
      charactersImage.height
    );

    const renderer = new RendererGL(display.view, charactersImage);

    const engine = new Engine(
      (dt) => {
        // move sprites by SPEED * deltaSeconds, ensuring smooth motion
        // for (let i = 0; i < count; i++) {
        //   const base = i * FLOATS_PER_SPRITE;
        //   data[base + 0] += SPEED * dt;
        // }
      },
      (_alpha) => {
        // alpha unused with variable timestep
        renderer.render({ data, count });
      }
    );

    engine.start();
  });
};
