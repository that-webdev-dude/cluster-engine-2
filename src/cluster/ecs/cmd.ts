import { Storage } from "./storage";
import {
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityId,
    EntityMeta,
} from "../types";
import { Archetype, Signature } from "./archetype";
import { SparseSet } from "../tools";
import { Scene } from "./scene";

export type Command =
    | { type: "allocate"; entityId: EntityId; comps?: ComponentValueMap }
    | { type: "delete"; entityId: EntityId };

export class CommandBuffer {
    private commands: Command[] = [];

    constructor(
        private readonly archetypeMap: Map<
            Signature,
            Storage<ComponentDescriptor[]>
        >,
        private readonly entityMetaSet: SparseSet<EntityId, EntityMeta>
    ) {}

    private getStorageByEntityId(
        entityId: EntityId
    ): Storage<ComponentDescriptor[]> | undefined {
        const meta = this.entityMetaSet.get(entityId);
        if (meta !== undefined) {
            const storage = this.archetypeMap.get(meta.archetype.signature);
            if (storage !== undefined) {
                return storage;
            }
        }
        return undefined;
    }

    private getStorageBySignature(
        signature: Signature
    ): Storage<ComponentDescriptor[]> | undefined {
        const storage = this.archetypeMap.get(signature);
        if (storage !== undefined) {
            return storage;
        }

        return undefined;
    }

    allocate(entityId: EntityId, comps?: ComponentValueMap) {
        this.commands.push({ type: "allocate", entityId, comps });
    }

    delete(entityId: EntityId) {
        this.commands.push({ type: "delete", entityId });
    }

    flush() {
        for (const cmd of this.commands) {
            switch (cmd.type) {
                case "allocate":
                    if (cmd.comps !== undefined) {
                        const signature = Archetype.makeSignature(
                            ...(Object.keys(cmd.comps).map(
                                Number
                            ) as ComponentType[])
                        );

                        const storage = this.getStorageBySignature(signature);
                        if (storage !== undefined) {
                            const { chunkId, row } = storage.allocate(
                                cmd.entityId,
                                cmd.comps
                            );
                            this.entityMetaSet.insert(cmd.entityId, {
                                archetype: storage.archetype,
                                // entityId: cmd.entityId,
                                chunkId,
                                row,
                            });
                        }
                    }
                    break;

                case "delete":
                    const storage = this.getStorageByEntityId(cmd.entityId);
                    if (storage !== undefined) {
                        storage.delete(cmd.entityId);
                        this.entityMetaSet.remove(cmd.entityId);

                        // remove the entire storage if there are no entities left
                        if (storage.entityCount === 0) {
                            this.archetypeMap.delete(
                                storage.archetype.signature
                            );
                        }
                    }
                    break;

                default:
                    break;
            }
        }
        this.commands.length = 0;
    }
}
