// import { Renderer } from "./cluster/gl/Renderer";
// import { RectData } from "./cluster/gl/pipelines/rectData";
// import { RectPipeline } from "./cluster/gl/pipelines/rect";

// // --- ECS world simulation for 2D rectangles ---
// interface Position {
//     x: number;
//     y: number;
// }
// interface Size {
//     w: number;
//     h: number;
// }
// interface FillColor {
//     r: number;
//     g: number;
//     b: number;
//     a: number;
// }

// type Entity = number;

// class World {
//     private nextId = 1;
//     private positions = new Map<Entity, Position>();
//     private sizes = new Map<Entity, Size>();
//     private colors = new Map<Entity, FillColor>();

//     createEntity(): Entity {
//         return this.nextId++;
//     }

//     addPosition(e: Entity, p: Position) {
//         this.positions.set(e, p);
//     }
//     addSize(e: Entity, s: Size) {
//         this.sizes.set(e, s);
//     }
//     addColor(e: Entity, c: FillColor) {
//         this.colors.set(e, c);
//     }

//     queryEntities(): Entity[] {
//         // Return entities that have all three components
//         return Array.from(this.positions.keys()).filter(
//             (e) => this.sizes.has(e) && this.colors.has(e)
//         );
//     }

//     getPosition(e: Entity): Position {
//         return this.positions.get(e)!;
//     }
//     getSize(e: Entity): Size {
//         return this.sizes.get(e)!;
//     }
//     getColor(e: Entity): FillColor {
//         return this.colors.get(e)!;
//     }
// }

// // --- Main test harness ---
// function main() {
//     // Create renderer and pipeline
//     const renderer = Renderer.getInstance({
//         parent: "#app",
//         width: 800,
//         height: 600,
//         antialias: false,
//     });
//     const rectPipeline = new RectPipeline(renderer, [
//         "Position",
//         "Size",
//         "FillColor",
//     ]);

//     // Set up a world with random rectangles
//     const world = new World();
//     for (let i = 0; i < 500; i++) {
//         const e = world.createEntity();
//         world.addPosition(e, {
//             x: Math.random() * 800,
//             y: Math.random() * 600,
//         });
//         world.addSize(e, {
//             w: 20 + Math.random() * 60,
//             h: 20 + Math.random() * 60,
//         });
//         world.addColor(e, {
//             r: Math.random(),
//             g: Math.random(),
//             b: Math.random(),
//             a: 1,
//         });
//     }

//     // Render loop
//     function renderLoop() {
//         renderer.clear();
//         rectPipeline.bind(renderer.gl);

//         const entities = world.queryEntities();
//         const count = entities.length;

//         // Pack SoA data
//         const data: RectData = {
//             positions: new Float32Array(count * 2),
//             sizes: new Float32Array(count * 2),
//             colors: new Float32Array(count * 4),
//         };

//         entities.forEach((e, i) => {
//             const pos = world.getPosition(e);
//             const sz = world.getSize(e);
//             const col = world.getColor(e);
//             data.positions[2 * i] = pos.x;
//             data.positions[2 * i + 1] = pos.y;
//             data.sizes[2 * i] = sz.w;
//             data.sizes[2 * i + 1] = sz.h;
//             data.colors[4 * i] = col.r;
//             data.colors[4 * i + 1] = col.g;
//             data.colors[4 * i + 2] = col.b;
//             data.colors[4 * i + 3] = col.a;
//         });

//         // Draw all rectangles
//         rectPipeline.draw(renderer.gl, data, count);

//         requestAnimationFrame(renderLoop);
//     }

//     requestAnimationFrame(renderLoop);
// }

// // Ensure there's a container in the HTML:
// // <div id="app"></div>

// export default () => {
//     main();
// };
