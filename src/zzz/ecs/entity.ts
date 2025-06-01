/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

import { IDPool } from "../tools/IDPool";

type EntityId = number;

export class Entity {
    private static nextEntityId: EntityId = 0;

    private static freeEntityIds: Set<EntityId> = new Set();

    static create(): EntityId {
        const iterator = this.freeEntityIds.values();
        const next = iterator.next();
        if (!next.done) {
            this.freeEntityIds.delete(next.value);
            return next.value;
        }
        return this.nextEntityId++;
    }

    static destroy(entityId: EntityId): void {
        if (entityId < this.nextEntityId && !this.freeEntityIds.has(entityId)) {
            this.freeEntityIds.add(entityId);
        } else {
            if (DEBUG) {
                console.warn(
                    `Entity.destroy: attempt to destroy an already destroyed entity: ${entityId}`
                );
            }
        }
    }
}
