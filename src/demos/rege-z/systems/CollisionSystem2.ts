import {
    Archetype,
    ECSUpdateSystem,
    CommandBuffer,
    View,
    Store,
    Vector,
    UniformGrid,
} from "../../../cluster";
import { Component } from "../components";
import { CollisionEvent, CollisionContact } from "../events";
import {
    ComponentType,
    EntityMeta,
    EntityId,
    Buffer,
} from "../../../cluster/types";
import { SparseSet } from "../../../cluster/tools";
import { AABB } from "../../../cluster/tools/Partitioner";

export interface CollisionPair {
    main: ComponentType;
    targets: {
        target: ComponentType;
        eventType: string;
    }[];
}

export interface CollisionEntity {
    meta: EntityMeta;
    aabb: AABB;
    x: number;
    y: number;
    hw: number;
    hh: number;
}

export class CollisionSystem extends ECSUpdateSystem {
    private targetTypes: Set<ComponentType> = new Set();
    private readonly relevantTargets: SparseSet<EntityId, any> =
        new SparseSet();

    private cameraPos: Buffer | undefined = undefined;

    constructor(store: Store, private readonly config?: CollisionPair[]) {
        super(store);
    }

    private updateCameraPosition(view: View): void {
        view.forEachChunkWith(
            [Component.Camera, Component.Position],
            (chunk) => {
                if (chunk.count > 1)
                    console.warn(
                        "[CollisionSystem] Multiple cameras found - using the first one"
                    );

                this.cameraPos ??= new Float32Array(2); // nullish coalescing assignement
                this.cameraPos[0] = chunk.views.Position[0 * 2 + 0];
                this.cameraPos[1] = chunk.views.Position[0 * 2 + 1];
            }
        );
    }

    update(view: View, cmd: CommandBuffer, dt: number) {
        if (!this.config) return;

        // get the camera position on the first frame
        this.updateCameraPosition(view);

        if (!this.cameraPos) return;

        // Start of frame: Clear spatial index and entity storage

        // Culling phase: Collect only relevant entities (camera-visible, active areas, fast-moving)
        this.targetTypes.clear();
        this.relevantTargets.clear();
        for (const collisionSpec of this.config) {
            this.targetTypes = new Set<ComponentType>(
                collisionSpec.targets.map(({ target }) => target)
            );
        }

        // exit if there are no targets to process
        if (this.targetTypes.size === 0) return;

        for (const targetType of this.targetTypes) {
            view.forEachChunkWith(
                [targetType, Component.Position, Component.Size],
                (chunk, chunkId) => {
                    // ... from here
                }
            );
        }

        // Spatial indexing: Insert relevant entities into spatial index
        // Broad phase: Use spatial index to find potential collision pairs
        // Narrow phase: Perform detailed collision detection on potential pairs
        // Event emission: Emit collision events for actual collisions
        // End of frame: Clean up for next frame
    }
}
