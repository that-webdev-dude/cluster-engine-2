// little demo app to test on archetypes, chunks, and the engine
// this is simply drawing rectangles on screen.
// data is stored in a single chunk

import { Renderer } from "../cluster/gl/Renderer";
import { RectData } from "../cluster/gl/pipelines/rectData";
import { RectPipeline } from "../cluster/gl/pipelines/rect";
import { Engine } from "../cluster/core/Engine";
import { getArchetype } from "./ecs/archetype";
import { ComponentType, DESCRIPTORS } from "./ecs/components";
import { Chunk } from "./ecs/chunk";
import { Storage } from "./ecs/storage";

const renderer = Renderer.getInstance();

const rectPipeline = new RectPipeline(renderer, ["Position", "Size", "Color"]);

const engine = new Engine(60);

// 1. create a rectangle archetype
const rectangleArchetype = getArchetype([
    ComponentType.EntityId,
    ComponentType.Position,
    ComponentType.Size,
    ComponentType.Color,
    ComponentType.Velocity,
    ComponentType.PreviousPosition,
]);

// 2. create the rectangle component descriptors object
const rectangleDescriptors = [
    DESCRIPTORS[ComponentType.EntityId],
    DESCRIPTORS[ComponentType.Position],
    DESCRIPTORS[ComponentType.Size],
    DESCRIPTORS[ComponentType.Color],
    DESCRIPTORS[ComponentType.Velocity],
    DESCRIPTORS[ComponentType.PreviousPosition],
] as const;

// 3. create a sotrage of chunks
const storage = new Storage<typeof rectangleDescriptors>(rectangleArchetype);

for (let i = 0; i < 10; i++) {
    storage.allocate(i);
}

export default () => {};
