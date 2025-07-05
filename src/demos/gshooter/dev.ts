import { Game } from "../../cluster/ecs/game";
import { createGamePlay } from "./scenes/gamePlay";
import { Archetype } from "../../cluster/ecs/archetype";
import { Component, DESCRIPTORS } from "./components";
import { Chunk } from "../../cluster/ecs/chunk";

const testArchetype = Archetype.create("test", [Component.EntityId]);

const c = new Chunk<typeof DESCRIPTORS>(testArchetype);

export function dev() {
    // game.start();
}
