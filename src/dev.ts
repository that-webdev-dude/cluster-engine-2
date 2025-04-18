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
}

function dataPrep(
  instances: SpriteInstance[],
  imageWidth: number,
  imageHeight: number
): { data: Float32Array; count: number } {
  const count = instances.length;
  const FLOATS_PER_SPRITE = 10;
  const data = new Float32Array(count * FLOATS_PER_SPRITE);

  for (let i = 0; i < count; i++) {
    const s = instances[i];
    const base = i * FLOATS_PER_SPRITE;
    // UV calculation (with Y‑flip)
    const u = s.frameX / imageWidth;
    const v = 1 - (s.frameY + s.frameHeight) / imageHeight;
    const uw = s.frameWidth / imageWidth;
    const vh = s.frameHeight / imageHeight;

    // pack into the Float32Array
    data[base + 0] = s.x;
    data[base + 1] = s.y;
    data[base + 2] = s.rotation;
    data[base + 3] = s.scaleX * s.frameWidth;
    data[base + 4] = s.scaleY * s.frameHeight;
    data[base + 5] = 0; // unused / padding slot
    data[base + 6] = u;
    data[base + 7] = v;
    data[base + 8] = uw;
    data[base + 9] = vh;
  }

  return { data, count };
}

// lets create a dataset of 10000 instances of 32x32 sprites
const instances: SpriteInstance[] = [];
for (let i = 0; i < 1; i++) {
  instances.push({
    x: Math.random() * 800,
    y: Math.random() * 600,
    rotation: Math.random() * Math.PI * 2,
    scaleX: 1,
    scaleY: 1,
    frameX: 0,
    frameY: 0,
    frameWidth: 32,
    frameHeight: 32,
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
