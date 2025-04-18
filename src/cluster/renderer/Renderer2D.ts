// import { Assets } from "../core/Assets";
// import CharactersImageURL from "../../images/characters.png";

// interface Renderable {
//   image: HTMLImageElement;
//   frameX: number;
//   frameY: number;
//   opacity: number;
// }

// interface DataModel {
//   x: Float32Array;
//   y: Float32Array;
//   ox: Float32Array;
//   oy: Float32Array;
//   sx: Float32Array;
//   sy: Float32Array;
//   px: Float32Array;
//   py: Float32Array;
//   w: Uint16Array;
//   h: Uint16Array;
//   radians: Float32Array;
//   renderable: (Renderable | null)[];
// }

// // let's create a dataModel object for testing. 10 entries.
// const dataModel: DataModel = {
//   x: new Float32Array(10),
//   y: new Float32Array(10),
//   ox: new Float32Array(10),
//   oy: new Float32Array(10),
//   sx: new Float32Array(10),
//   sy: new Float32Array(10),
//   px: new Float32Array(10),
//   py: new Float32Array(10),
//   w: new Uint16Array(10),
//   h: new Uint16Array(10),
//   radians: new Float32Array(10),
//   renderable: [],
// };

// const image = Assets.image(CharactersImageURL);

// for (let i = 0; i < 10; i++) {
//   dataModel.x[i] = Math.random() * 100;
//   dataModel.y[i] = Math.random() * 100;
//   dataModel.ox[i] = Math.random();
//   dataModel.oy[i] = Math.random();
//   dataModel.sx[i] = Math.random() * 2;
//   dataModel.sy[i] = Math.random() * 2;
//   dataModel.px[i] = 16;
//   dataModel.py[i] = 16;
//   dataModel.w[i] = 32;
//   dataModel.h[i] = 32;
//   dataModel.radians[i] = Math.random() * Math.PI * 2;

//   dataModel.renderable[i] = {
//     image: image,
//     frameX: 0,
//     frameY: 0,
//     opacity: Math.random(),
//   };
// }

// export class Renderer2D {
//   private _context: CanvasRenderingContext2D;

//   constructor(context: CanvasRenderingContext2D) {
//     this._context = context;
//   }

//   public render(dataModel: DataModel, alpha: number): void {
//     this._context.clearRect(
//       0,
//       0,
//       this._context.canvas.width,
//       this._context.canvas.height
//     );

//     dataModel.renderable.forEach((renderable, i) => {
//       if (renderable) {
//         const x = dataModel.x[i] * alpha + dataModel.ox[i];
//         const y = dataModel.y[i] * alpha + dataModel.oy[i];
//         const w = dataModel.w[i];
//         const h = dataModel.h[i];
//         const sx = dataModel.sx[i];
//         const sy = dataModel.sy[i];
//         const px = dataModel.px[i];
//         const py = dataModel.py[i];
//         const radians = dataModel.radians[i];

//         this._context.save();
//         this._context.globalAlpha = renderable.opacity;
//         this._context.translate(x, y);
//         this._context.scale(sx, sy);
//         this._context.translate(px, py);
//         this._context.rotate(radians);
//         this._context.translate(-px, -py);

//         // Draw the image
//         this._context.drawImage(
//           renderable.image,
//           renderable.frameX,
//           renderable.frameY,
//           w,
//           h,
//           0,
//           0,
//           w,
//           h
//         );

//         this._context.restore();
//       }
//     });
//   }
// }
