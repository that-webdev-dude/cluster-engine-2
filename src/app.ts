// stressTest.ts
import { Engine } from "./cluster/core/Engine";
import { World } from "./cluster/ecs/World";
import { System } from "./cluster/ecs/System";
import { ComponentType } from "./cluster/ecs/Component";
import { Transform, Velocity } from "./demo01/components/components";
// import { StructuredContainer } from "./dev";

// Setup ECS World
const world = new World();

// Register components explicitly
world.registerComponent(ComponentType.TRANSFORM);
world.registerComponent(ComponentType.VELOCITY);

// here we instantiate structured containers for each component type
// const transformContainer = new StructuredContainer<Transform>();
// const velocityContainer = new StructuredContainer<Velocity>();

// Create thousands of entities
const ENTITY_COUNT = 10000;
for (let i = 0; i < ENTITY_COUNT; i++) {
  const entity = world.createEntity();

  const transform = {
    x: Math.random() * 100,
    y: Math.random() * 100,
  } as Transform;

  const velocity = {
    vx: Math.random() * 20 - 10,
    vy: Math.random() * 20 - 10,
  } as Velocity;

  world.addComponent(entity, ComponentType.TRANSFORM, transform);
  world.addComponent(entity, ComponentType.VELOCITY, velocity);

  // Add to structured containers
  // transformContainer.add(entity, transform, true);
  // velocityContainer.add(entity, velocity, true);
}

// Add Movement System
class MovementSystem extends System {
  private elapsedTime: number = 0;
  constructor() {
    super();
    this.world = world;
  }
  update(delta: number): void {
    const start = performance.now();
    const entities = this.world.getEntites([
      ComponentType.TRANSFORM,
      ComponentType.VELOCITY,
    ]);

    for (const entity of entities) {
      const transform = this.world.getComponent<Transform>(
        entity,
        ComponentType.TRANSFORM
      )!;
      const velocity = this.world.getComponent<Velocity>(
        entity,
        ComponentType.VELOCITY
      )!;
      transform.x += velocity.vx * delta;
      transform.y += velocity.vy * delta;
    } // this is iterating over all entities with the required components. consider batching.

    // assuming the subset is cached

    // // Update structured containers
    // const transformSubset = transformContainer.subset(entities);
    // for (const id of entities) {
    //   transformSubset.data.x[id] += 100 * delta;
    //   transformSubset.data.y[id] += 100 * delta;
    // }
    // // Commit changes back to the original containers
    // transformSubset.commitTo(transformContainer);
    const end = performance.now();
    console.log(`MovementSystem update time: ${end - start} ms`);
  }
}
world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world
// world.addSystem(new MovementSystem()); // Add the system to the world

// Setup Engine for performance monitoring
const engine = new Engine(update, render);
engine.start();

function update(delta: number): void {
  world.update(delta);
}

function render(alpha: number): void {
  // For now, no rendering—just measuring ECS performance
}

// Performance logger (FPS)
// setInterval(() => {
//   console.log(`Entities: ${ENTITY_COUNT}, FPS: ${engine.getFPS()}`);
// }, 1000);

export default () => {};

// ecs-2d-framework/
// ├── src/
// │   ├── engine/                    # Core game loop and entry points
// │   │   ├── Game.ts                # Manages scenes, entry point
// │   │   └── GameLoop.ts            # Update/render loops
// │   │
// │   ├── ecs/                       # Core ECS logic
// │   │   ├── Entity.ts
// │   │   ├── Component.ts
// │   │   ├── System.ts
// │   │   ├── EntityManager.ts
// │   │   ├── ComponentManager.ts
// │   │   ├── SystemManager.ts
// │   │   ├── World.ts
// │   │   └── Query.ts               # For fast entity/component querying
// │   │
// │   ├── scenes/                    # Scene management with layers
// │   │   ├── Scene.ts               # Base Scene class
// │   │   ├── SceneManager.ts
// │   │   └── layers/
// │   │       ├── UILayer.ts
// │   │       ├── GameplayLayer.ts
// │   │       ├── BackgroundLayer.ts
// │   │       └── DialogLayer.ts
// │   │
// │   ├── components/                # Default ECS components
// │   │   ├── Transform.ts
// │   │   ├── Velocity.ts
// │   │   ├── Sprite.ts
// │   │   ├── Collider.ts
// │   │   ├── Input.ts
// │   │   └── UIElement.ts           # UI-specific component
// │   │
// │   ├── systems/                   # ECS systems
// │   │   ├── PhysicsSystem.ts
// │   │   ├── CollisionSystem.ts
// │   │   ├── RenderSystem.ts
// │   │   ├── InputSystem.ts
// │   │   └── UISystem.ts
// │   │
// │   ├── rendering/                 # Rendering pipeline
// │   │   ├── Renderer.ts
// │   │   ├── Camera.ts
// │   │   └── SpriteBatch.ts
// │   │
// │   ├── collision/                 # Collision utilities (expandable)
// │   │   └── AABB.ts
// │   │
// │   ├── input/                     # User input handling
// │   │   ├── InputHandler.ts
// │   │   ├── Keyboard.ts
// │   │   └── Mouse.ts
// │   │
// │   ├── math/                      # Common math tools
// │   │   ├── Vector2.ts
// │   │   ├── Rect.ts
// │   │   └── MathUtils.ts
// │   │
// │   ├── assets/                    # Asset loaders/managers
// │   │   ├── AssetLoader.ts
// │   │   ├── ImageAsset.ts
// │   │   └── AudioAsset.ts
// │   │
// │   ├── utils/                     # General utilities
// │   │   ├── ObjectPool.ts
// │   │   ├── Timer.ts
// │   │   └── Logger.ts
// │   │
// │   ├── workers/                   # Multithreading Web Workers
// │   │   ├── PhysicsWorker.ts
// │   │   └── CollisionWorker.ts
// │   │
// │   └── index.ts                   # Public API entry
// │
// ├── public/                        # Served assets (images, audio, json config)
// │   ├── sprites/
// │   ├── audio/
// │   └── config/
// │
// ├── tests/                         # Unit and integration tests
// ├── examples/                      # Sample games demonstrating framework usage
// │   ├── platformer/
// │   ├── shooter/
// │   └── fighting-game/
// │
// ├── benchmarks/                    # Performance profiling
// ├── docs/                          # Documentation and examples
// ├── .github/                       # CI/CD workflows
// ├── dist/                          # Build output
// ├── package.json
// ├── tsconfig.json
// └── README.md
