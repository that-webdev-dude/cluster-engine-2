// src/index.ts

import { Display } from "./cluster/core/Display";
import { World } from "./cluster/ecs/World";
import { Engine } from "./cluster/ecs/Engine";
import { TransformComponent, ColorComponent } from "./cluster/ecs/components";
import { RendererV3 } from "./cluster/renderer/RendererV3";
import { RenderSystem } from "./cluster/ecs/systems/RendererSystem";
import { MovementSystem } from "./cluster/ecs/systems/MovementSystem";

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
  engine.addSystem(new MovementSystem(world));
  engine.addSystem(new RenderSystem(world, renderer));

  engine.start();
};
