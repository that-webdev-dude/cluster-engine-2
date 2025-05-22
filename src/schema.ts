import {
    TransformComponent,
    TransformComponentSchema,
    TransformComponentLayout,
} from "./cluster/ecs/components/TransformComponent";
import { World } from "./cluster/ecs/World";

// USAGE
const world = new World();

function createRandomEntities(count: number = 256) {
    for (let i = 0; i < count; i++) {
        const entity = world.createEntity();
        const transform = TransformComponent.create();
        console.log("TransformComponent", transform);
        const px = Math.random() * 100;
        const py = Math.random() * 100;
        const sx = Math.random() * 10;
        const sy = Math.random() * 10;
        const r = ((Math.random() * 360) / 180) * Math.PI;
        transform.position = [px, py];
        transform.scale = [sx, sy];
        transform.rotation = r;

        world.addEntityComponent(entity, transform);
    }
}

// const ENTITY_COUNT = 256 * 1;
const ENTITY_COUNT = 1;

const FPS = 60;
const FRAME_TIME = 1000 / FPS;

createRandomEntities(ENTITY_COUNT);

const transformStorage = world.getComponentStorage<
    typeof TransformComponentSchema
>(TransformComponentSchema.name);

console.log(transformStorage);

const startTime = performance.now();
transformStorage.forEachChunk((chunk) => {
    const { position, scale, rotation } = chunk;
    for (let i = 0; i < chunk.length; i++) {
        // console.log(i);
        const px = position[i * 2 + 0];
        const py = position[i * 2 + 1];
        const sx = scale[i * 2 + 0];
        const sy = scale[i * 2 + 1];
        const r = rotation[i];

        // console.log(transformStorage.read(chunk.entities[i]));

        // ... do something with the data
    }
});
const endTime = performance.now();
console.log(
    `Iterating over ${ENTITY_COUNT} entities took ${endTime - startTime}ms`
);

export default () => {};
