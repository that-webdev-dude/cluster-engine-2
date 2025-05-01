// src/index.ts

import { Display } from "./cluster/core/Display";
import { World } from "./cluster/ecs/World";
import { Engine } from "./cluster/ecs/Engine";
import { TransformComponent, ColorComponent } from "./cluster/ecs/components";
import { RendererV3 } from "./cluster/renderer/RendererV3";
import { RenderSystem } from "./cluster/ecs/systems/RendererSystem";
import { InputSystem } from "./cluster/ecs/systems/InputSystem";
import { MovementSystem } from "./cluster/ecs/systems/MovementSystem";
import { CullingSystem } from "./cluster/ecs/systems/CullingSystem";
import { CameraSystem } from "./cluster/ecs/systems/CameraSystem";

export default () => {
  const display = new Display({
    parentID: "#app",
    width: 600,
    height: 400,
  });

  const gl = display.view.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: false,
    stencil: false,
  });
  if (!gl) throw new Error("WebGL2 not supported");
  const renderer = new RendererV3(gl);

  display.resizeCb = (width, height) => {
    renderer.resize(width, height);
  };

  const world = new World();

  // grab the canvas
  const canvas = display.view as HTMLCanvasElement;
  // Populate the world with 1000 random quads
  const count = 1000;
  for (let i = 0; i < count; i++) {
    const e = world.createEntity();
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 10 + Math.random() * 20;
    const rotation = Math.random() * Math.PI * 2;
    const color: [number, number, number, number] = [
      Math.random(),
      Math.random(),
      Math.random(),
      1,
    ];
    world.addComponent(
      e,
      new TransformComponent([x, y], [size, size], rotation)
    );
    world.addComponent(e, new ColorComponent(color));
  }

  const engine = new Engine();
  engine.addSystem(new InputSystem(world));
  engine.addSystem(new MovementSystem(world));
  engine.addSystem(new CameraSystem(world));
  engine.addSystem(new CullingSystem(world));
  engine.addSystem(new RenderSystem(world, renderer));
  engine.start();
};

// We’ve now got “brute-force” per-entity frustum culling in place, and it’ll work fine up to a few tens of thousands of quads. If you start pushing past ~50 k entities, you’ll see the cost of scanning every Transform each frame creep up.

// So, on the culling front you have two options:

// Leave it as is if your performance is already acceptable.

// Add spatial partitioning—for example:

// A simple uniform grid: bin each entity into a cell based on its position/scale, then only test the handful of cells overlapping the camera’s bounds.

// Or a quadtree/BVH: dynamically insert/remove entities into tree nodes so your per-frame cull only visits O(log N) nodes, not all N entities.

// Either of those would slot into your CullingSystem with minimal changes: you just replace the “for every entity” loop with “for every entity in the visible cells/nodes.”

// If you’d rather move on, here’s what comes next in our roadmap:
// Chunked processing & web-worker buffer‐fills (still in Phase 3):
// Split your archetype arrays into fixed‐size chunks (e.g. 256 entities each), run each chunk’s instance-data packing in parallel (or just in tight loops), and then memcpy chunk by chunk into your big Float32Array.

// Phase 4: Advanced GPU‐driven paths

// Transform feedback so the GPU computes per-instance matrices (no CPU pack at all).

// Texture‐buffer lookups for instance data, feeding a small index buffer to drawElementsInstanced.

// (Down the line) indirect draws in WebGPU.

// New render pipelines (e.g. textured sprites, particles) to prove the plug-in system.

// Let me know which you’d like to tackle:

// Add a uniform-grid culling layer?

// Chunked + possibly multi-threaded instance buffer fill?

// Jump ahead to GPU‐side techniques?

// Or start building a second pipeline (e.g. sprites)?
