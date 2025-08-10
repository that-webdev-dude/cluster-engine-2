import { ComponentValueMap, EntityId, EntityMeta } from "../types";
import { Archetype } from "./archetype";
import { Scene } from "./scene";

export type Command =
    | {
          type: "createEntity";
          archetype: Archetype<any>;
          comps: ComponentValueMap;
      }
    | {
          type: "updateEntity";
          meta: EntityMeta;
          comps: ComponentValueMap;
      }
    | {
          type: "removeEntity";
          meta: EntityMeta;
      };

export class CommandBuffer {
    private commands: Command[] = [];

    constructor(private readonly scene: Scene) {}

    create(archetype: Archetype<any>, comps: ComponentValueMap) {
        this.commands.push({ type: "createEntity", archetype, comps });
    }

    update(meta: EntityMeta, comps: ComponentValueMap) {
        const duplicateCommand = this.commands.find((c) => {
            return (
                c.type === "updateEntity" &&
                c.meta.archetype === meta.archetype &&
                c.meta.chunkId === meta.chunkId &&
                c.meta.row === meta.row
            );
        });
        if (duplicateCommand === undefined)
            this.commands.push({ type: "updateEntity", meta, comps });
    }

    remove(meta: EntityMeta) {
        const duplicateCommand = this.commands.find((c) => {
            return (
                c.type === "removeEntity" &&
                c.meta.archetype === meta.archetype &&
                c.meta.chunkId === meta.chunkId &&
                c.meta.row === meta.row
            );
        });
        if (duplicateCommand === undefined)
            this.commands.push({ type: "removeEntity", meta });
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

                case "updateEntity":
                    this.scene.updateEntity(cmd.meta, cmd.comps);
                    break;

                case "removeEntity":
                    this.scene.removeEntity(cmd.meta);
                    break;
            }
        }
        this.commands.length = 0;
    }

    clear() {
        this.commands.length = 0;
    }
}
