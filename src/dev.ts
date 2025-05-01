// import { Engine } from "./cluster/core/Engine";
// import { Display } from "./cluster/core/Display";
// import { Assets } from "./cluster/core/Assets";
// import { RendererGL } from "./cluster/renderer/RendererGL";
// import CharactersImageURL from "./images/characters.png";

// interface SpriteState {
//   // dynamic:
//   x: number;
//   y: number;
//   vx: number;
//   vy: number;
//   rotation: number;
//   rotationSpeed: number;
//   // static (atlas):
//   frameX: number;
//   frameY: number;
//   frameWidth: number;
//   frameHeight: number;
//   scaleX: number;
//   scaleY: number;
//   pivotNormX: number;
//   pivotNormY: number;
//   uvX: number;
//   uvY: number;
//   uvW: number;
//   uvH: number;
// }

// const SPRITE_COUNT = 20;
// const FLOATS_PER_SPRITE = 12; // must match RendererGL

// export default () => {
//   const SHAKE_DURATION = 0.5; // seconds
//   const SHAKE_INTENSITY = 16; // max pixels of shake
//   let shakeTimeLeft = 0;

//   const img = Assets.image(CharactersImageURL);
//   Assets.onReady(() => {
//     const display = new Display({
//       parentID: "#app",
//       width: 834,
//       height: 640,
//     });
//     const canvas = display.view;

//     // 1) Build our array of states
//     const states: SpriteState[] = [];
//     for (let i = 0; i < SPRITE_COUNT; i++) {
//       // pick a random 32×32 cell at (0,0) in the atlas:
//       const fx = 0,
//         fy = 0,
//         fw = 32,
//         fh = 32;
//       const u = fx / img.width,
//         v = fy / img.height;
//       const uw = fw / img.width,
//         vh = fh / img.height;
//       const px = 16 / fw,
//         py = 16 / fh;

//       states.push({
//         x: Math.random() * (canvas.width - fw),
//         y: Math.random() * (canvas.height - fh),
//         vx: (Math.random() * 2 - 1) * 200, // px/sec
//         vy: (Math.random() * 2 - 1) * 200,
//         rotation: 0,
//         rotationSpeed: (Math.random() * 2 - 1) * Math.PI, // rad/sec

//         frameX: fx,
//         frameY: fy,
//         frameWidth: fw,
//         frameHeight: fh,
//         scaleX: 1,
//         scaleY: 1,

//         pivotNormX: px,
//         pivotNormY: py,
//         uvX: u,
//         uvY: v,
//         uvW: uw,
//         uvH: vh,
//       });
//     }

//     // 2) Allocate & fill the instance‐data buffer
//     const data = new Float32Array(SPRITE_COUNT * FLOATS_PER_SPRITE);
//     for (let i = 0; i < SPRITE_COUNT; i++) {
//       const s = states[i];
//       const b = i * FLOATS_PER_SPRITE;
//       // offset.x, offset.y
//       data[b + 0] = s.x;
//       data[b + 1] = s.y;
//       // rotScale: angle, sizeX, sizeY, pad
//       data[b + 2] = s.rotation;
//       data[b + 3] = s.scaleX * s.frameWidth;
//       data[b + 4] = s.scaleY * s.frameHeight;
//       data[b + 5] = 0;
//       // texRegion: u,v,uw,vh
//       data[b + 6] = s.uvX;
//       data[b + 7] = s.uvY;
//       data[b + 8] = s.uvW;
//       data[b + 9] = s.uvH;
//       // pivot
//       data[b + 10] = s.pivotNormX;
//       data[b + 11] = s.pivotNormY;
//     }

//     const renderer = new RendererGL(canvas, img);

//     // Listen for Spacebar → start shake
//     window.addEventListener("keydown", (e) => {
//       if (e.code === "Space") {
//         shakeTimeLeft = SHAKE_DURATION;
//       }
//     });

//     // 3) Game loop: update bounce & rotation, then render
//     const engine = new Engine(
//       (dt) => {
//         if (shakeTimeLeft > 0) {
//           // random offset each frame, fading out linearly
//           const norm = shakeTimeLeft / SHAKE_DURATION;
//           const mag = SHAKE_INTENSITY * norm;
//           const ox = (Math.random() * 2 - 1) * mag;
//           const oy = (Math.random() * 2 - 1) * mag;
//           renderer.setGlobalOffset(ox, oy);

//           shakeTimeLeft -= dt;
//           if (shakeTimeLeft <= 0) {
//             // done shaking: reset offset
//             renderer.setGlobalOffset(0, 0);
//             shakeTimeLeft = 0;
//           }
//         }

//         for (let i = 0; i < SPRITE_COUNT; i++) {
//           const s = states[i];
//           // move
//           s.x += s.vx * dt;
//           s.y += s.vy * dt;
//           // bounce X
//           if (s.x < 0) {
//             s.x = 0;
//             s.vx *= -1;
//           } else if (s.x > canvas.width - s.frameWidth) {
//             s.x = canvas.width - s.frameWidth;
//             s.vx *= -1;
//           }
//           // bounce Y
//           if (s.y < 0) {
//             s.y = 0;
//             s.vy *= -1;
//           } else if (s.y > canvas.height - s.frameHeight) {
//             s.y = canvas.height - s.frameHeight;
//             s.vy *= -1;
//           }
//           // rotate
//           s.rotation += s.rotationSpeed * dt;

//           // write back *only* the 3 dynamic floats:
//           const b = i * FLOATS_PER_SPRITE;
//           data[b + 0] = s.x;
//           data[b + 1] = s.y;
//           data[b + 2] = s.rotation;
//         }
//       },
//       () => {
//         // render all instances in one call
//         renderer.render({ data, count: SPRITE_COUNT });
//       }
//     );

//     engine.start();
//   });
// };
