import { Storage } from "./storage";
import { ComponentValueMap } from "../types";

export type Command =
    | { type: "allocate"; entityId: number; comps?: ComponentValueMap }
    | { type: "delete"; entityId: number };

export class CommandBuffer {
    private commands: Command[] = [];

    allocate(entityId: number, comps?: ComponentValueMap) {
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
