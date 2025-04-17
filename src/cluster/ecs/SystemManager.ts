import { System } from "./System";
import { World } from "./World";

export class SystemManager {
  private systems: System[] = [];

  addSystem(system: System, world: World): void {
    system.init(world);
    this.systems.push(system);
  }

  updateSystems(delta: number): void {
    for (const system of this.systems) {
      system.update(delta);
    }
  }
}
