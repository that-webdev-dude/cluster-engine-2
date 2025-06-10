/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

// type ID = number;

// export class IDPool {
//     private first: number;

//     private nextId: ID;

//     private freeIds: Set<ID> = new Set();

//     constructor(first: number = 0) {
//         this.first = first;
//         this.nextId = first;
//     }

//     acquire(): ID {
//         const iterator = this.freeIds.values();
//         const next = iterator.next();
//         if (!next.done) {
//             this.freeIds.delete(next.value);
//             return next.value;
//         }
//         return this.nextId++;
//     }

//     release(id: ID): void {
//         if (id < this.nextId && !this.freeIds.has(id)) {
//             this.freeIds.add(id);
//         } else {
//             if (DEBUG) {
//                 console.warn(
//                     `IDPool.release: attempt to release an invalid or already released ID: ${id}`
//                 );
//             }
//         }
//     }

//     reset() {
//         this.nextId = 0;
//         this.freeIds = new Set();
//     }

//     getStats() {
//         return {
//             nextId: this.nextId,
//             freeCount: this.freeIds.size,
//         };
//     }
// }

export class IDPool<ID extends number> {
    private first: ID;

    private nextId: ID;

    private freeIds: Set<ID> = new Set();

    constructor(first?: ID) {
        this.first = first || (0 as ID);
        this.nextId = first || (0 as ID);
    }

    acquire(): ID {
        const iterator = this.freeIds.values();
        const next = iterator.next();
        if (!next.done) {
            this.freeIds.delete(next.value);
            return next.value;
        }
        return this.nextId++ as ID;
    }

    release(id: ID): void {
        if (id < this.nextId && !this.freeIds.has(id)) {
            this.freeIds.add(id);
        } else {
            if (DEBUG) {
                console.warn(
                    `IDPool.release: attempt to release an invalid or already released ID: ${id}`
                );
            }
        }
    }

    reset() {
        this.nextId = 0 as ID;
        this.freeIds = new Set();
    }

    getStats() {
        return {
            nextId: this.nextId,
            freeCount: this.freeIds.size,
        };
    }
}
