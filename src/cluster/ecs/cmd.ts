import { ComponentValueMap, EntityMeta } from "../types";
import { Archetype } from "./archetype";
import { Entity } from "./entity";
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
    private readonly commands: Command[] = [];

    private readonly updateQueue = new Map<bigint, number>();
    private readonly removeQueue = new Set<bigint>();

    constructor(private readonly scene: Scene) {}

    create(archetype: Archetype<any>, comps: ComponentValueMap) {
        this.commands.push({ type: "createEntity", archetype, comps });
    }

    update(meta: EntityMeta, comps: ComponentValueMap) {
        const entityID = Entity.createMetaID(meta);
        const existingIndex = this.updateQueue.get(entityID);
        if (existingIndex !== undefined) {
            const existingCommand = this.commands[existingIndex];
            if (existingCommand.type === "updateEntity") {
                Object.assign(existingCommand.comps, comps);
            }
            return;
        }
        const commandIndex =
            this.commands.push({ type: "updateEntity", meta, comps }) - 1;
        this.updateQueue.set(entityID, commandIndex);
    }

    remove(meta: EntityMeta) {
        const entityID = Entity.createMetaID(meta);
        if (this.removeQueue.has(entityID)) return;
        this.removeQueue.add(entityID);
        this.commands.push({ type: "removeEntity", meta });
    }

    flush() {
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
        this.clear();
    }

    clear() {
        this.commands.length = 0;
        this.updateQueue.clear();
        this.removeQueue.clear();
    }
}
