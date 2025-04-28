import { World } from "./cluster/ecs/World";
import { TransformComponent, ColorComponent } from "./cluster/ecs/components";

const world = new World();

class NameComponent {
  constructor(public name: string) {}
}

const e0 = world.createEntity(); // 0
const e1 = world.createEntity(); // 1

world.addComponent(e0, new TransformComponent([10, 20], [1, 1], 0));
world.addComponent(e0, new ColorComponent([1, 0, 0, 1])); // red

world.addComponent(e1, new TransformComponent([1, 1], [1, 1], 0));
world.addComponent(e1, new ColorComponent([0, 1, 0, 1])); // green

const renderables = world.query(TransformComponent, ColorComponent);
console.log("Entities with Transform and Color components:", renderables); // [0, 1]

world.removeComponent(e0, ColorComponent);
const newRenderables = world.query(TransformComponent, ColorComponent);
console.log(
  "Entities with Transform and Color components after removal:",
  newRenderables
); // [1]

world.destroyEntity(e1);
const afterDestroy = world.query(TransformComponent, ColorComponent);
console.log(
  "Entities with Transform and Color components after destroy:",
  afterDestroy
);

export default () => {};
