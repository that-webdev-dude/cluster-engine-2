import { Storage } from "./storageV2";
import { ComponentAssignmentMap } from "./componentsV2";

export type Command =
    | { type: "allocate"; entityId: number; comps?: ComponentAssignmentMap }
    | { type: "delete"; entityId: number };

export class CommandBuffer {
    private commands: Command[] = [];

    allocate(entityId: number, comps?: ComponentAssignmentMap) {
        this.commands.push({ type: "allocate", entityId, comps });
    }

    delete(entityId: number) {
        this.commands.push({ type: "delete", entityId });
    }

    flush(storage: Storage<any>) {
        for (const cmd of this.commands) {
            switch (cmd.type) {
                case "allocate":
                    if (cmd.comps !== undefined) {
                        storage.allocate(cmd.entityId, cmd.comps);
                    }
                    break;

                case "delete":
                    storage.delete(cmd.entityId);
                    break;

                default:
                    break;
            }
        }
        this.commands.length = 0;
    }
}
