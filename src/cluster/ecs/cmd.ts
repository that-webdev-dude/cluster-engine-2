import { ComponentValueMap, EntityId } from "../types";
import { Archetype } from "./archetype";
import { Scene } from "./scene";
import { DEBUG } from "../tools";

export type Command =
    | {
          type: "createEntity";
          archetype: Archetype<any>;
          comps: ComponentValueMap;
      }
    | { type: "removeEntity"; entityId: EntityId }
    | {
          type: "findEntityId";
          archetype: Archetype<any>;
          chunkId: number;
          row: number;
      };

export class CommandBuffer {
    private commands: Command[] = [];

    constructor(private readonly scene: Scene) {}

    create(archetype: Archetype<any>, comps: ComponentValueMap) {
        this.commands.push({ type: "createEntity", archetype, comps });
    }

    remove(entityId: EntityId) {
        this.commands.push({ type: "removeEntity", entityId });
    }

    findEntityId(archetype: Archetype<any>, chunkId: number, row: number) {
        this.commands.push({ type: "findEntityId", archetype, chunkId, row });
    }

    flush() {
        // if (DEBUG) {
        //     console.log("Flushing", this.commands.length, "commands");
        // }

        for (const cmd of this.commands) {
            switch (cmd.type) {
                case "createEntity":
                    this.scene.createEntity(cmd.archetype, cmd.comps);
                    break;

                case "removeEntity":
                    this.scene.removeEntity(cmd.entityId);
                    break;

                case "findEntityId":
                    this.scene.findEntityId(
                        cmd.archetype,
                        cmd.chunkId,
                        cmd.row
                    );
                    break;
            }
        }
        this.commands.length = 0;
    }

    clear() {
        this.commands.length = 0;
    }
}
