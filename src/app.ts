// src/index.ts

import { Display } from "./cluster/core/Display";
import { World } from "./cluster/ecs/World";
import { Engine } from "./cluster/core/Engine";
import { TransformComponent, ColorComponent } from "./cluster/ecs/components";
import { RendererV3 } from "./cluster/renderer/RendererV3";
import { RenderSystem } from "./cluster/ecs/systems/RendererSystem";
import { InputSystem } from "./cluster/ecs/systems/InputSystem";
import { MovementSystem } from "./cluster/ecs/systems/MovementSystem";
import { CullingSystem } from "./cluster/ecs/systems/CullingSystem";
import { CameraSystem } from "./cluster/ecs/systems/CameraSystem";
import { LerpSystem } from "./cluster/ecs/systems/LerpSystem";
import {
  UniformGrid,
  SparseGrid,
  Quadtree,
  LooseQuadtree,
  AABB,
} from "./cluster/tools/SpatialPartitioning";
import { config } from "./cluster/config";
import {
  createTilemap,
  createRandomQuads,
  makeAABB,
} from "./cluster/ecs/utils";

const { viewport } = config;

export default () => {
  const display = new Display({
    parentID: "#app",
    width: viewport.width,
    height: viewport.height,
  });

  const gl = display.view.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: false,
    stencil: false,
  });
  if (!gl) throw new Error("WebGL2 not supported");
  const renderer = new RendererV3(gl);

  display.resizeCb = (width, height) => renderer.resize(width, height);

  const world = new World();

  // createTilemap(world, config.world.width, config.world.height, 32);
  createRandomQuads(world, config.world.width, config.world.height, 10000);

  // 3) Build one shared spatial index over the *world* extents
  const worldBounds: AABB = {
    minX: 0,
    minY: 0,
    maxX: config.world.width,
    maxY: config.world.height,
  };
  // pick your node capacity & maxDepth to taste
  const grid = new LooseQuadtree<number>(
    worldBounds,
    /* capacity */ 8,
    /* maxDepth */ 6
  );

  // 4) Seed the grid with all tile entities
  for (const e of world.query(TransformComponent)) {
    const t = world.getComponent(e, TransformComponent)!;
    grid.insert(e, makeAABB(t));
  }

  const inputSystem = new InputSystem(world);
  const movementSystem = new MovementSystem(world, grid);
  const cameraSystem = new CameraSystem(world);
  const cullingSystem = new CullingSystem(world, grid);
  const lerpStstem = new LerpSystem(world);
  const renderSystem = new RenderSystem(world, renderer);

  cameraSystem.init();

  const engine = new Engine();
  // add the updateable systems to the engine
  engine.addUpdateable(lerpStstem); // this needs to be first to snapshot prev values
  engine.addUpdateable(inputSystem);
  engine.addUpdateable(movementSystem);
  engine.addUpdateable(cameraSystem);
  engine.addUpdateable(cullingSystem);
  // add the render system to the engine
  engine.addRenderable(renderSystem);

  engine.start();
};

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
