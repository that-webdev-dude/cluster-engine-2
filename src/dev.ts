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
  pivotX: number; // new: in pixels, relative to top‑left of the frame
  pivotY: number; // new: in pixels
}

function dataPrep(
  instances: SpriteInstance[],
  imageWidth: number,
  imageHeight: number
): { data: Float32Array; count: number } {
  const count = instances.length;
  const FLOATS_PER_SPRITE = 12; // was 10 → now +2 for pivot
  const data = new Float32Array(count * FLOATS_PER_SPRITE);

  for (let i = 0; i < count; i++) {
    const s = instances[i];
    const base = i * FLOATS_PER_SPRITE;

    // UV calculation
    const u = s.frameX / imageWidth;
    const v = s.frameY / imageHeight;
    const uw = s.frameWidth / imageWidth;
    const vh = s.frameHeight / imageHeight;

    // normalized pivot in [0..1]
    const pivotNormX = s.pivotX / s.frameWidth;
    const pivotNormY = s.pivotY / s.frameHeight;

    data[base + 0] = s.x;
    data[base + 1] = s.y;
    data[base + 2] = s.rotation;
    data[base + 3] = s.scaleX * s.frameWidth;
    data[base + 4] = s.scaleY * s.frameHeight;
    data[base + 5] = 0; // padding (still unused)
    data[base + 6] = u;
    data[base + 7] = v;
    data[base + 8] = uw;
    data[base + 9] = vh;
    data[base + 10] = pivotNormX; // ← new
    data[base + 11] = pivotNormY; // ← new
  }

  return { data, count };
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// lets create a dataset of 10000 instances of 32x32 sprites
const instances: SpriteInstance[] = [];
for (let i = 0; i < 1; i++) {
  instances.push({
    x: 100,
    y: 100,
    rotation: degreesToRadians(0),
    scaleX: 1,
    scaleY: 1,
    frameX: 0,
    frameY: 0,
    frameWidth: 32,
    frameHeight: 32,
    pivotX: 16, // center of the sprite
    pivotY: 16, // center of the sprite
  });
}

// preload the image
const charactersImage = Assets.image(CharactersImageURL);

export default () => {
  // Usage example
  Assets.onReady(() => {
    const display = new Display({
      parentID: "#app",
      width: 800,
      height: 600,
    });

    // ctrate the instanceData here
    const { data, count } = dataPrep(
      instances,
      charactersImage.width,
      charactersImage.height
    );

    const renderer = new RendererGL(display.view, charactersImage);

    const engine = new Engine(
      () => {},
      () => {
        let start = performance.now();
        renderer.render({ data, count });
        let end = performance.now();
        console.log("Render time: ", end - start, "ms");
      }
    );
    engine.start();
  });
};
