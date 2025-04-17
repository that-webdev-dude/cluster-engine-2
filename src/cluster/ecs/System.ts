import { World } from "./World";

export abstract class System {
  protected world!: World;

  init(world: World): void {
    this.world = world;
  }

  abstract update(delta: number): void;
}
