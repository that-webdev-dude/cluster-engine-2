import { ComponentValueMap, EntityId } from "../types";
import { ArchetypeV2 } from "./archetypeV2";
import { SceneV2 } from "./sceneV2";
import { DEBUG } from "../tools";

export type Command =
    | {
          type: "createEntity";
          archetype: ArchetypeV2<any>;
          comps: ComponentValueMap;
      }
    | { type: "removeEntity"; entityId: EntityId };

export class CommandBufferV2 {
    private commands: Command[] = [];

    constructor(private readonly scene: SceneV2) {}

    create(archetype: ArchetypeV2<any>, comps: ComponentValueMap) {
        this.commands.push({ type: "createEntity", archetype, comps });
    }

    remove(entityId: EntityId) {
        this.commands.push({ type: "removeEntity", entityId });
    }

    flush() {
        if (DEBUG) {
            console.log("Flushing", this.commands.length, "commands");
        }

        for (const cmd of this.commands) {
            switch (cmd.type) {
                case "createEntity":
                    this.scene.createEntity(cmd.archetype, cmd.comps);
                    break;

                case "removeEntity":
                    this.scene.removeEntity(cmd.entityId);
                    break;
            }
        }
        this.commands.length = 0;
    }

    clear() {
        this.commands.length = 0;
    }
}
